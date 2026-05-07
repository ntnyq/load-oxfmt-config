import { readFile, stat } from 'node:fs/promises'
import { extname, isAbsolute, join } from 'node:path'
import { interopDefault } from '@ntnyq/utils'
import { parse as parseJSONC } from 'jsonc-parser'
import {
  OXFMT_CONFIG_FILES,
  OXFMT_EXPLICIT_CONFIG_EXTENSIONS,
} from './constants'
import type { OxfmtOptions } from './types'

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
 * @returns Parsed config object.
 */
export async function readConfigFromFile(
  resolvedPath: string,
): Promise<OxfmtOptions> {
  const extension = extname(resolvedPath)

  if (
    extension === '.ts' ||
    extension === '.mts' ||
    extension === '.cts' ||
    extension === '.js' ||
    extension === '.mjs' ||
    extension === '.cjs'
  ) {
    const createJiti = await interopDefault(import('jiti'))
    const jiti = createJiti(import.meta.url)
    const mod = await jiti.import<Record<string, unknown>>(resolvedPath)
    const config = mod['default'] ?? mod
    return config as OxfmtOptions
  }

  const content = await readFile(resolvedPath, 'utf8')

  if (extension === '.jsonc') {
    return parseJSONC(content) as OxfmtOptions
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
