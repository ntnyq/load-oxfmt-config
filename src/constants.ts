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
 * Supported EditorConfig filename.
 */
export const EDITORCONFIG_FILE = '.editorconfig'

/**
 * Sections that apply globally and can be merged into root-level oxfmt options.
 */
export const EDITORCONFIG_GLOBAL_SECTION_NAMES = ['*', '**']
