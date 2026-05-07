import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { isObject } from '@ntnyq/utils'
import {
  getConfigCacheKey,
  getResolveCacheKey,
  readConfigFromFile,
  resolveOxfmtrcPath,
} from './config-file'
import {
  getEditorconfigResolveCacheKey,
  getEditorconfigSearchDir,
  mergeOverrides,
  mergeRootOptions,
  readEditorconfigFromFile,
  resolveEditorconfigPath,
} from './editorconfig'
import type { LoadOxfmtConfigResult, Options, OxfmtOptions } from './types'
import { cachePromise } from './utils'

// Cache resolved config paths keyed by cwd + configPath
const resolveCache = new Map<string, Promise<string | undefined>>()

// Cache parsed config objects keyed by resolvedPath + resolveKey
const configCache = new Map<string, Promise<OxfmtOptions>>()

export { resolveOxfmtrcPath } from './config-file'

/**
 * Resolve config + editorconfig and return merged config with metadata.
 *
 * @param options - Loader settings.
 * @returns Merged config and optional resolved config metadata.
 *
 * @example
 * ```ts
 * import { loadOxfmtConfigResult } from 'load-oxfmt-config'
 *
 * const result = await loadOxfmtConfigResult({ cwd: process.cwd() })
 * console.log(result.config)
 * ```
 */
export async function loadOxfmtConfigResult(
  options: Options = {},
): Promise<LoadOxfmtConfigResult> {
  const useCache = options.useCache !== false
  const cwd = resolve(options.cwd || process.cwd())
  const editorconfig = options.editorconfig ?? true
  const useEditorconfig = editorconfig !== false
  const isEditorconfigOptionsObject = useEditorconfig && isObject(editorconfig)

  const onlyCwd = isEditorconfigOptionsObject
    ? (editorconfig.onlyCwd ?? false)
    : false

  const editorconfigCwd =
    isEditorconfigOptionsObject && editorconfig.cwd
      ? resolve(editorconfig.cwd)
      : undefined

  const resolveKey = getResolveCacheKey(cwd, options.configPath)
  const editorconfigSearchDir =
    editorconfigCwd || getEditorconfigSearchDir(cwd, options.configPath)
  const editorconfigResolveKey = editorconfigCwd
    ? getEditorconfigResolveCacheKey(
        `${editorconfigCwd}::${options.configPath || ''}`,
      )
    : getEditorconfigResolveCacheKey(resolveKey)

  const resolvedPath = useCache
    ? await cachePromise(resolveCache, resolveKey, () =>
        resolveOxfmtrcPath(cwd, options.configPath),
      )
    : await resolveOxfmtrcPath(cwd, options.configPath)

  const editorconfigPath = useEditorconfig
    ? await (useCache
        ? cachePromise(resolveCache, editorconfigResolveKey, () =>
            resolveEditorconfigPath(editorconfigSearchDir, onlyCwd),
          )
        : resolveEditorconfigPath(editorconfigSearchDir, onlyCwd))
    : undefined

  const anchorDir = dirname(resolvedPath || editorconfigPath || cwd)

  const loadTask = async () => {
    const oxfmtConfig = resolvedPath
      ? await readConfigFromFile(resolvedPath).catch(error => {
          throw new Error(
            `Failed to parse oxfmt configuration file at ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
            {
              cause: error,
            },
          )
        })
      : {}

    if (!editorconfigPath) {
      return oxfmtConfig
    }

    const editorconfigData = await readEditorconfigFromFile(
      editorconfigPath,
      anchorDir,
    )

    const mergedConfig = mergeRootOptions(
      oxfmtConfig,
      editorconfigData.rootOptions,
    )
    const mergedOverrides = mergeOverrides(
      oxfmtConfig.overrides,
      editorconfigData.overrides,
    )

    if (!mergedOverrides) {
      return mergedConfig
    }

    return {
      ...mergedConfig,
      overrides: mergedOverrides,
    }
  }

  const hasNoConfigSources = !resolvedPath && !editorconfigPath
  const config: OxfmtOptions = await (async () => {
    if (hasNoConfigSources) {
      return useCache
        ? await cachePromise(
            configCache,
            getConfigCacheKey(resolvedPath, editorconfigPath, resolveKey),
            () => Promise.resolve({}),
          )
        : {}
    }

    return useCache
      ? await cachePromise(
          configCache,
          getConfigCacheKey(resolvedPath, editorconfigPath, resolveKey),
          loadTask,
        )
      : await loadTask()
  })()

  return {
    config,
    ...(resolvedPath
      ? { filepath: resolvedPath, dirname: dirname(resolvedPath) }
      : {}),
  }
}
