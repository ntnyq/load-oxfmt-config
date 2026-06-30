import { readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, isAbsolute, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { interopDefault } from '@ntnyq/utils'
import type { ParseError } from 'jsonc-parser'
import { parse as parseJSONC, printParseErrorCode } from 'jsonc-parser'
import {
  OXFMT_CONFIG_FILES,
  OXFMT_EXPLICIT_CONFIG_EXTENSIONS,
} from './constants'
import type { OxfmtOptions } from './types'

/**
 * CommonJS require scoped to this ESM module for loading `.cjs` config files.
 */
const require = createRequire(import.meta.url)

/**
 * Check whether an unknown config export is an object accepted by oxfmt.
 *
 * @param value - Runtime value to validate.
 * @returns True when the value can be treated as an oxfmt options object.
 */
function isConfigObject(value: unknown): value is OxfmtOptions {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read the default export from a JavaScript or TypeScript config module.
 *
 * @param mod - Imported config module namespace.
 * @returns Oxfmt config object from the module default export.
 * @throws When the module has no default export or the default export is not an object.
 */
function readConfigDefaultExport(mod: Record<string, unknown>): OxfmtOptions {
  if (!Object.hasOwn(mod, 'default')) {
    throw new Error('Configuration file has no default export.')
  }

  const config = mod['default']

  if (!isConfigObject(config)) {
    throw new Error(
      'Configuration file must have a default export that is an object.',
    )
  }

  return config
}

/**
 * Read a CommonJS module export as an oxfmt config object.
 *
 * @param config - Runtime CommonJS export value.
 * @returns Oxfmt config object from the module export.
 * @throws When the module export is not an object.
 */
function readConfigModuleExports(config: unknown): OxfmtOptions {
  if (!isConfigObject(config)) {
    throw new Error('Configuration file must export an object.')
  }

  return config
}

/**
 * Import a JavaScript or TypeScript config module through jiti.
 *
 * @param resolvedPath - Absolute config file path to import.
 * @param useCache - Whether jiti should use its filesystem and module caches.
 * @returns Imported module namespace.
 */
async function importJitiConfigModule(
  resolvedPath: string,
  useCache: boolean,
): Promise<Record<string, unknown>> {
  const createJiti = await interopDefault(import('jiti'))
  const jiti = createJiti(
    import.meta.url,
    useCache ? undefined : { fsCache: false, moduleCache: false },
  )
  return jiti.import<Record<string, unknown>>(resolvedPath)
}

/**
 * Build a cache-busting import key from file metadata.
 *
 * @param resolvedPath - Absolute config file path.
 * @returns Stable key that changes when file mtime or size changes.
 */
async function getFreshImportCacheKey(resolvedPath: string) {
  const stats = await stat(resolvedPath, { bigint: true })
  return `${stats.mtimeNs}:${stats.size}`
}

/**
 * Import an ESM config module with a metadata-based cache-busting query.
 *
 * @param resolvedPath - Absolute config file path to import.
 * @returns Imported module namespace.
 */
async function importNativeFreshModule(
  resolvedPath: string,
): Promise<Record<string, unknown>> {
  const url = pathToFileURL(resolvedPath)
  url.searchParams.set(
    'oxfmtConfigCacheBust',
    await getFreshImportCacheKey(resolvedPath),
  )
  return import(url.href) as Promise<Record<string, unknown>>
}

/**
 * Require a CommonJS module after removing it from Node's require cache.
 *
 * @param resolvedPath - Absolute config file path to require.
 * @returns Runtime module export value.
 */
function requireFreshModule(resolvedPath: string): unknown {
  const requirePath = require.resolve(resolvedPath)
  Reflect.deleteProperty(require.cache, requirePath)
  // eslint-disable-next-line import/no-dynamic-require -- Config paths are provided at runtime.
  return require(requirePath)
}

/**
 * Load a CommonJS config file without reusing Node's require cache.
 *
 * @param resolvedPath - Absolute `.cjs` config file path.
 * @returns Oxfmt config object from default or module exports.
 */
function requireFreshCommonJSConfig(resolvedPath: string): OxfmtOptions {
  const configModule = requireFreshModule(resolvedPath)
  if (Object.prototype.toString.call(configModule) === '[object Module]') {
    return readConfigDefaultExport(configModule as Record<string, unknown>)
  }

  return readConfigModuleExports(configModule)
}

/**
 * Load a JavaScript config file without reusing stale module contents.
 *
 * This supports CommonJS, native ESM, and jiti fallback loading so package type
 * and syntax differences can be handled consistently.
 *
 * @param resolvedPath - Absolute `.js` config file path.
 * @returns Imported module namespace with a default config export.
 */
async function importFreshJavaScriptConfigModule(
  resolvedPath: string,
): Promise<Record<string, unknown>> {
  try {
    const configModule = requireFreshModule(resolvedPath)
    if (Object.prototype.toString.call(configModule) === '[object Module]') {
      return importNativeFreshModule(resolvedPath)
    }

    return { default: readConfigModuleExports(configModule) }
  } catch {
    try {
      return await importNativeFreshModule(resolvedPath)
    } catch {
      return importJitiConfigModule(resolvedPath, false)
    }
  }
}

/**
 * Build a cache key for path resolution (cwd + configPath).
 *
 * @param cwd - Current working directory.
 * @param configPath - Optional config path.
 * @returns Cache key for resolve cache.
 */
export function getResolveCacheKey(cwd: string, configPath?: string): string {
  return `${cwd}::${configPath || ''}`
}

/**
 * Build a cache key for config content; prefixes missing entries.
 *
 * @param resolvedPath - Resolved oxfmt config path.
 * @param editorconfigPath - Resolved editorconfig path.
 * @param resolveKey - Resolution cache key.
 * @returns Cache key for config content cache.
 */
export function getConfigCacheKey(
  resolvedPath: string | undefined,
  editorconfigPath: string | undefined,
  resolveKey: string,
): string {
  const oxfmtKey = resolvedPath || `missing-oxfmt:${resolveKey}`
  const editorconfigKey =
    editorconfigPath || `missing-editorconfig:${resolveKey}`
  return `${oxfmtKey}::${editorconfigKey}`
}

/**
 * Resolve the oxfmt config file path.
 *
 * - If `configPath` is provided, absolute paths are returned as-is;
 *   relative paths are joined to `cwd`.
 * - Otherwise, walk upward from `cwd` to find known filenames.
 *
 * @param cwd - Starting directory for resolution.
 * @param configPath - Optional explicit path.
 * @returns Absolute path to config file, or undefined when not found.
 *
 * @example
 * ```ts
 * import { resolveOxfmtrcPath } from 'load-oxfmt-config'
 *
 * const path = await resolveOxfmtrcPath(process.cwd())
 * ```
 */
export async function resolveOxfmtrcPath(
  cwd: string,
  configPath?: string,
): Promise<string | undefined> {
  const resolvedCwd = resolve(cwd)

  if (configPath) {
    return isAbsolute(configPath) ? configPath : join(resolvedCwd, configPath)
  }

  let currentDir = resolvedCwd

  while (true) {
    for (const filename of OXFMT_CONFIG_FILES) {
      const configFilePath = join(currentDir, filename)

      try {
        const stats = await stat(configFilePath)
        if (stats.isFile()) {
          return configFilePath
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code !== 'ENOENT' && code !== 'ENOTDIR') {
          throw error
        }

        // File does not exist, continue searching.
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
 * Read and parse an oxfmt config file.
 *
 * @param resolvedPath - Absolute path to config file.
 * @param options - Config loading options.
 * @returns Parsed config object.
 */
export async function readConfigFromFile(
  resolvedPath: string,
  options: { useCache?: boolean } = {},
): Promise<OxfmtOptions> {
  const extension = extname(resolvedPath)
  const useCache = options.useCache !== false

  if (
    extension === '.ts' ||
    extension === '.mts' ||
    extension === '.cts' ||
    extension === '.js' ||
    extension === '.mjs' ||
    extension === '.cjs'
  ) {
    if (!useCache && extension === '.cjs') {
      return requireFreshCommonJSConfig(resolvedPath)
    }

    if (!useCache && extension === '.mjs') {
      const mod = await importNativeFreshModule(resolvedPath)
      return readConfigDefaultExport(mod)
    }

    if (!useCache && extension === '.js') {
      const mod = await importFreshJavaScriptConfigModule(resolvedPath)
      return readConfigDefaultExport(mod)
    }

    const mod = await importJitiConfigModule(resolvedPath, useCache)
    return readConfigDefaultExport(mod)
  }

  const content = await readFile(resolvedPath, 'utf8')

  if (extension === '.jsonc') {
    const parseErrors: ParseError[] = []
    const parsed = parseJSONC(content, parseErrors, {
      allowTrailingComma: true,
      allowEmptyContent: true,
    })
    if (parseErrors.length > 0) {
      const firstError = parseErrors[0]
      const errorCode =
        firstError === undefined
          ? 'Unknown'
          : printParseErrorCode(firstError.error)
      throw new Error(`Invalid JSONC syntax: ${errorCode}`)
    }

    return (parsed ?? {}) as OxfmtOptions
  }

  if (extension === '.json') {
    return JSON.parse(content) as OxfmtOptions
  }

  if (!extension) {
    return JSON.parse(content) as OxfmtOptions
  }

  if (!OXFMT_EXPLICIT_CONFIG_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Unsupported oxfmt config extension "${extension}" at ${resolvedPath}`,
    )
  }

  return JSON.parse(content) as OxfmtOptions
}
