/**
 * Supported configuration files for oxfmt.
 * @see https://oxc.rs/docs/guide/usage/formatter/config.html#oxfmtrc-json-c
 */
export const OXFMT_CONFIG_FILES = [
  '.oxfmtrc.json',
  '.oxfmtrc.jsonc',
  'oxfmt.config.ts',
]

/**
 * Supported extensions for explicit config paths.
 */
export const OXFMT_EXPLICIT_CONFIG_EXTENSIONS = [
  '.json',
  '.jsonc',
  '.ts',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
]

/**
 * Default ignored directories used by oxfmt CLI semantics.
 */
export const DEFAULT_IGNORED_DIRS = ['.git', '.svn', '.jj', 'node_modules']

/**
 * Common lockfiles ignored by default.
 *
 * Note: oxfmt docs only list package-lock.json and pnpm-lock.yaml explicitly,
 * then mention "etc.". This list mirrors common ecosystem lockfiles.
 */
export const DEFAULT_IGNORED_LOCKFILES = [
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
]

/**
 * Default ignore files loaded from cwd when --ignore-path is not provided.
 */
export const DEFAULT_IGNORE_FILES = ['.gitignore', '.prettierignore']

/**
 * Supported EditorConfig filename.
 */
export const EDITORCONFIG_FILE = '.editorconfig'

/**
 * Sections that apply globally and can be merged into root-level oxfmt options.
 */
export const EDITORCONFIG_GLOBAL_SECTION_NAMES = ['*']
