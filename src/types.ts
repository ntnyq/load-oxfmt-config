import type { FormatConfig } from 'oxfmt'

/**
 * Object-form editorconfig option, enabling fine-grained control.
 */
export interface EditorconfigOption {
  /**
   * When `true`, only look for `.editorconfig` in the `cwd` directory itself
   * (no upward traversal).
   *
   * @default false
   */
  onlyCwd?: boolean
  /**
   * Override the directory from which `.editorconfig` resolution starts.
   * When set, editorconfig is searched from this directory instead of from
   * the config file's directory (or the top-level `cwd`).
   *
   * This is useful when the oxfmt config path is pre-resolved and you still
   * want editorconfig to be resolved relative to each file's directory.
   */
  cwd?: string
}

/**
 * Format option override for a single matching rule
 */
export interface OxfmtConfigOverride {
  /**
   * Glob patterns to match files
   */
  files: string[]
  /**
   * Glob patterns to exclude files
   */
  excludeFiles?: string[]
  /**
   * Format options to apply
   */
  options?: FormatConfig
}

// Options for loading oxfmt configuration
export interface Options {
  /**
   * Path to the configuration file
   */
  configPath?: string
  /**
   * Current working directory
   */
  cwd?: string
  /**
   * Whether to use cache
   */
  useCache?: boolean
  /**
   * Control `.editorconfig` reading.
   * - `true` (default): read and merge `.editorconfig`, walking up from the config
   *   file's directory (or `cwd` when no config path is given).
   * - `false`: disable `.editorconfig` reading entirely.
   * - `EditorconfigOption`: enable with additional settings (e.g. `onlyCwd`).
   *
   * @default true
   */
  editorconfig?: boolean | EditorconfigOption
}

/**
 * Final oxfmt options (including overrides)
 */
export interface OxfmtOptions extends FormatConfig {
  /**
   * Ignore files matching these glob patterns
   * Patterns are based on the location of the Oxfmt configuration file
   */
  ignorePatterns?: string[]
  /**
   * Array of format option overrides
   */
  overrides?: OxfmtConfigOverride[]
}

/**
 * Result object with metadata about resolved oxfmt config.
 */
export interface LoadOxfmtConfigResult {
  /**
   * Final merged config (oxfmt + optional editorconfig mapping)
   */
  config: OxfmtOptions
  /**
   * Absolute path of resolved config file
   */
  filepath?: string
  /**
   * Directory of resolved config file
   */
  dirname?: string
}

/**
 * Options for resolving whether a single file should be ignored.
 */
export interface IsOxfmtIgnoredOptions {
  /**
   * Current working directory.
   * Also the base directory for default .gitignore/.prettierignore lookup.
   */
  cwd?: string
  /**
   * File path to test.
   */
  filepath: string
  /**
   * Explicit oxfmt config path.
   * When provided, nested config lookup is disabled (same as oxfmt CLI -c).
   */
  configPath?: string
  /**
   * Ignore files to use instead of cwd .gitignore/.prettierignore.
   * Can be passed multiple times in CLI style.
   */
  ignorePath?: string | string[]
  /**
   * Whether node_modules should be included.
   * @default true
   */
  withNodeModules?: boolean
  /**
   * Disable nested config lookup.
   * @default false
   */
  disableNestedConfig?: boolean
  /**
   * Whether to use in-memory cache.
   * @default true
   */
  useCache?: boolean
  /**
   * Whether to include ignore patterns defined in the config file.
   * @default true
   */
  includeConfigIgnorePatterns?: boolean
}

/**
 * Ignore resolution result.
 */
export interface IsOxfmtIgnoredResult {
  /**
   * Whether the file should be ignored.
   */
  ignored: boolean
  /**
   * Matched ignore source.
   */
  reason?:
    | 'default-dir'
    | 'lockfile'
    | 'gitignore'
    | 'prettierignore'
    | 'ignore-path'
    | 'config-ignore-patterns'
}

/**
 * @deprecated Use `OxfmtConfigOverride` instead
 */
export type FormatOptionOverride = OxfmtConfigOverride
