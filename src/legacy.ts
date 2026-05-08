import { loadOxfmtConfigResult } from './core'
import type { LoadOxfmtConfigOptions, OxfmtOptions } from './types'

/**
 * Legacy API that returns only the merged config object.
 *
 * Prefer using `loadOxfmtConfigResult` when you also need resolved config metadata.
 *
 * @deprecated Prefer `loadOxfmtConfigResult`.
 *
 * @param options - Loader options.
 * @returns Parsed and merged oxfmt options.
 *
 * @example
 * ```ts
 * import { loadOxfmtConfig } from 'load-oxfmt-config'
 *
 * // Deprecated: prefer loadOxfmtConfigResult.
 * const config = await loadOxfmtConfig({ cwd: process.cwd() })
 * ```
 */
export async function loadOxfmtConfig(
  options: LoadOxfmtConfigOptions = {},
): Promise<OxfmtOptions> {
  const result = await loadOxfmtConfigResult(options)
  return result.config
}
