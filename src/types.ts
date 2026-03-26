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
 * @deprecated Use `OxfmtConfigOverride` instead
 */
export type FormatOptionOverride = OxfmtConfigOverride
