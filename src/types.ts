import type { FormatOptions } from 'oxfmt'

/**
 * Format option override for a single matching rule
 */
export interface FormatOptionOverride {
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
  options?: FormatOptions
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
}

/**
 * Final oxfmt options (including overrides)
 */
export interface OxfmtOptions extends FormatOptions {
  /**
   * Ignore files matching these glob patterns
   * Patterns are based on the location of the Oxfmt configuration file
   */
  ignorePatterns?: string[]
  /**
   * Array of format option overrides
   */
  overrides?: FormatOptionOverride[]
}
