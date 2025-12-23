import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { parse as parseJSONC } from 'jsonc-parser'
import { OXFMT_CONFIG_FILES } from './constants'
import type { Options, OxfmtConfig } from './types'

const resolveCache = new Map<string, Promise<string | undefined>>()
const configCache = new Map<string, Promise<OxfmtConfig>>()

/**
 * Load oxfmt configuration by resolving the config file path and parsing its contents.
 * Uses in-memory caches by default; set `useCache` to false to force re-read.
 */
export async function loadOxfmtConfig(
  options: Options = {},
): Promise<OxfmtConfig> {
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
 * Resolve the oxfmt config file path, searching upward from the provided cwd when no explicit path is given.
 */
export async function resolveOxfmtrcPath(
  cwd: string,
  configPath?: string,
): Promise<string | undefined> {
  if (configPath) {
    return join(cwd, configPath)
  }

  let currentDir = cwd

  while (true) {
    for (const filename of OXFMT_CONFIG_FILES) {
      const configFilePath = join(currentDir, filename)

      try {
        const { stat } = await import('node:fs/promises')
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

function getConfigCacheKey(
  resolvedPath: string | undefined,
  resolveKey: string,
) {
  return resolvedPath || `missing:${resolveKey}`
}

function getResolveCacheKey(cwd: string, configPath?: string) {
  return `${cwd}::${configPath || ''}`
}

async function readConfigFromFile(resolvedPath: string): Promise<OxfmtConfig> {
  const content = await readFile(resolvedPath, 'utf-8')

  if (resolvedPath.endsWith('.jsonc')) {
    return parseJSONC(content) as OxfmtConfig
  }
  return JSON.parse(content) as OxfmtConfig
}
