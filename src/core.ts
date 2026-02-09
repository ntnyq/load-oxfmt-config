import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import process from 'node:process'
import { parse as parseJSONC } from 'jsonc-parser'
import { OXFMT_CONFIG_FILES } from './constants'
import type { Options, OxfmtOptions } from './types'

// Cache resolved config paths keyed by cwd + configPath
const resolveCache = new Map<string, Promise<string | undefined>>()

// Cache parsed config objects keyed by resolvedPath + resolveKey
const configCache = new Map<string, Promise<OxfmtOptions>>()

/**
 * Load oxfmt configuration: resolve the file path, then read and parse it.
 * Caching is enabled by default; pass `useCache: false` to force a re-read.
 *
 * @param options - Optional loader settings (cwd, configPath, useCache).
 * @returns Parsed oxfmt OxfmtOptions or an empty object when missing.
 * @throws {Error} when the config file exists but cannot be parsed.
 *
 * @example
 * ```ts
 * const config = await loadOxfmtConfig({ cwd: '/project' })
 * ```
 */
export async function loadOxfmtConfig(
  options: Options = {},
): Promise<OxfmtOptions> {
  const useCache = options.useCache !== false
  const cwd = options.cwd || process.cwd()
  const resolveKey = getResolveCacheKey(cwd, options.configPath)

  const resolvedPath = useCache
    ? await cachePromise(resolveCache, resolveKey, () =>
        resolveOxfmtrcPath(cwd, options.configPath),
      )
    : await resolveOxfmtrcPath(cwd, options.configPath)

  if (!resolvedPath) {
    if (!useCache) {
      return {}
    }

    return cachePromise(
      configCache,
      getConfigCacheKey(resolvedPath, resolveKey),
      () => Promise.resolve({}),
    )
  }

  const loadTask = () =>
    readConfigFromFile(resolvedPath).catch(err => {
      throw new Error(
        `Failed to parse oxfmt configuration file at ${resolvedPath}: ${err instanceof Error ? err.message : String(err)}`,
        {
          cause: err,
        },
      )
    })

  if (!useCache) {
    return loadTask()
  }

  return cachePromise(
    configCache,
    getConfigCacheKey(resolvedPath, resolveKey),
    loadTask,
  )
}

/**
 * Resolve the oxfmt config file path.
 * - If `configPath` is provided, absolute paths are returned as-is; relative paths are joined to cwd.
 * - Otherwise, walk upward from cwd to find known filenames.
 *
 * @param cwd - Starting directory for resolution.
 * @param configPath - Optional explicit path (absolute or relative to cwd).
 * @returns Absolute path to the config file, or undefined when not found.
 */
export async function resolveOxfmtrcPath(
  cwd: string,
  configPath?: string,
): Promise<string | undefined> {
  if (configPath) {
    return isAbsolute(configPath) ? configPath : join(cwd, configPath)
  }

  let currentDir = cwd

  while (true) {
    for (const filename of OXFMT_CONFIG_FILES) {
      const configFilePath = join(currentDir, filename)

      try {
        const stats = await stat(configFilePath)
        if (stats.isFile()) {
          return configFilePath
        }
      } catch {
        // File does not exist, continue searching
      }
    }

    const parentDir = join(currentDir, '..')

    if (parentDir === currentDir) {
      break
    }
    currentDir = parentDir
  }

  return undefined
}

/**
 * Return a cached promise by key, creating and storing it on miss; failures clear the entry.
 *
 * @param cache - Map used to store inflight/resolved promises.
 * @param key - Cache key.
 * @param factory - Factory to create the promise when missing.
 * @returns Cached or newly created promise.
 */
function cachePromise<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  factory: () => Promise<T>,
) {
  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  const task = factory().catch(err => {
    cache.delete(key)
    throw err
  })

  cache.set(key, task)
  return task
}

/**
 * Build a cache key for config content; prefixes missing entries with `missing:`.
 *
 * @param resolvedPath - Resolved config path or undefined when missing.
 * @param resolveKey - Key used for path resolution caching.
 * @returns Cache key for config content.
 */
function getConfigCacheKey(
  resolvedPath: string | undefined,
  resolveKey: string,
) {
  return resolvedPath || `missing:${resolveKey}`
}

/**
 * Build a cache key for path resolution (cwd + configPath).
 *
 * @param cwd - Current working directory.
 * @param configPath - Optional config path.
 * @returns Cache key for resolve cache.
 */
function getResolveCacheKey(cwd: string, configPath?: string) {
  return `${cwd}::${configPath || ''}`
}

/**
 * Read and parse config file, supporting JSON and JSONC.
 *
 * @param resolvedPath - Absolute path to the config file.
 * @returns Parsed OxfmtOptions object.
 */
async function readConfigFromFile(resolvedPath: string): Promise<OxfmtOptions> {
  const content = await readFile(resolvedPath, 'utf-8')

  if (resolvedPath.endsWith('.jsonc')) {
    return parseJSONC(content) as OxfmtOptions
  }
  return JSON.parse(content) as OxfmtOptions
}
