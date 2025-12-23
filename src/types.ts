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
 * Oxfmt configuration interface
 */
export interface OxfmtConfig {
  /**
   * Include parentheses around a sole arrow function parameter.
   * @default `always`
   */
  arrowParens?: 'always' | 'avoid'
  /**
   * Put the `>` of a multi-line JSX element at the end of the last line\ninstead of being alone on the next line.
   * @default false
   */
  bracketSameLine?: boolean
  /**
   * Print spaces between brackets in object literals.
   * @default true
   */
  bracketSpacing?: boolean
  /**
   * Control whether to format embedded parts in the file.
   * @default `off`
   */
  embeddedLanguageFormatting?: 'auto' | 'off'
  /**
   * Which end of line characters to apply.
   * @default `lf`
   */
  endOfLine?: 'cr' | 'crlf' | 'lf'
  /**
   * Experimental: Sort `package.json` keys.
   * @default true
   */
  experimentalSortPackageJson?: boolean
  /**
   * Ignore files matching these glob patterns. Current working directory is used as the root.
   */
  ignorePatterns?: string[]
  /**
   * Whether to insert a final newline at the end of the file.
   * @default true
   */
  insertFinalNewline?: boolean
  /**
   * Use single quotes instead of double quotes in JSX.
   * @default false
   */
  jsxSingleQuote?: boolean
  /**
   * How to wrap object literals when they could fit on one line or span multiple lines.
   * @default `preserve`
   * NOTE: In addition to Prettier's `preserve` and `collapse`, we also support `always`
   */
  objectWrap?: 'always' | 'never' | 'preserve'
  /**
   * The line length that the printer will wrap on.
   * @default 100
   */
  printWidth?: number
  /**
   * Change when properties in objects are quoted.
   * @default `as-needed`
   */
  quoteProps?: 'as-needed' | 'consistent' | 'preserve'
  /**
   * Print semicolons at the ends of statements.
   * @default true
   */
  semi?: boolean
  /**
   * Put each attribute on a new line in JSX.
   * @default false
   */
  singleAttributePerLine?: boolean
  /**
   * Use single quotes instead of double quotes.
   * @default false
   */
  singleQuote?: boolean
  /**
   * Number of spaces per indentation level.
   * @default 2
   */
  tabWidth?: number
  /**
   * Print trailing commas wherever possible.
   * @default `all`
   */
  trailingComma?: 'all' | 'es5' | 'none'
  /**
   * Use tabs for indentation or spaces.
   * @default false
   */
  useTabs?: boolean
  /**
   * Experimental: Sort import statements. Disabled by default.
   */
  experimentalSortImports?: {
    /**
     * Custom groups configuration for organizing imports.\nEach array element represents a group, and multiple group names in the same array are treated as one.\nAccepts both `string` and `string[]` as group elements.
     */
    groups?: Array<string | string[]>
    /**
     * Ignore case when sorting.
     * @default true
     */
    ignoreCase?: boolean
    /**
     * Glob patterns to identify internal imports.
     */
    internalPattern?: string[]
    /**
     * Add newlines between import groups.
     * @default true
     */
    newlinesBetween?: boolean
    /**
     * Sort order. (Default: `asc`)
     * @default `asc`
     */
    order?: 'asc' | 'desc'
    /**
     * Partition imports by comments.
     * @default false
     */
    partitionByComment?: boolean
    /**
     * Partition imports by newlines.
     * @default false
     */
    partitionByNewline?: boolean
    /**
     * Sort side-effect imports.
     * @default false
     */
    sortSideEffects?: boolean
  }
}
