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
 * @deprecated Use `OxfmtConfigOverride` instead
 */
export type FormatOptionOverride = OxfmtConfigOverride
