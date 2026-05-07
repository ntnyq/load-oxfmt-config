import { readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { isBoolean, isNumber } from '@ntnyq/utils'
import { parseBuffer } from 'editorconfig'
import type { SectionBody, SectionName } from 'editorconfig'
import type { FormatConfig } from 'oxfmt'
import {
  EDITORCONFIG_FILE,
  EDITORCONFIG_GLOBAL_SECTION_NAMES,
} from './constants'
import type { OxfmtConfigOverride, OxfmtOptions } from './types'

/**
 * Oxfmt reads these .editorconfig properties
 *
 * @see https://oxc.rs/docs/guide/usage/formatter/config.html#editorconfig
 */
export type EditorconfigOptions = Pick<
  FormatConfig,
  | 'endOfLine'
  | 'insertFinalNewline'
  | 'printWidth'
  | 'singleQuote'
  | 'tabWidth'
  | 'useTabs'
>

export interface EditorconfigData {
  overrides: OxfmtConfigOverride[]
  rootOptions: EditorconfigOptions
}

/**
 * Builds the cache key used for resolved EditorConfig lookups.
 *
 * @param resolveKey - The base resolution key for the current lookup.
 * @returns The namespaced cache key for EditorConfig resolution.
 */
export function getEditorconfigResolveCacheKey(resolveKey: string) {
  return `editorconfig::${resolveKey}`
}

/**
 * Determines the directory that should be used to search for a nearby .editorconfig file.
 *
 * @param cwd - The current working directory for the lookup.
 * @param configPath - An optional config path used to anchor the search.
 * @returns The directory where EditorConfig discovery should begin.
 */
export function getEditorconfigSearchDir(cwd: string, configPath?: string) {
  if (!configPath) {
    return cwd
  }

  const resolvedConfigPath = isAbsolute(configPath)
    ? configPath
    : join(cwd, configPath)
  return dirname(resolvedConfigPath)
}

/**
 * Merges root-level EditorConfig options with oxfmt config options.
 *
 * @param oxfmtConfig - The explicit oxfmt options.
 * @param editorconfigRootOptions - Root options derived from .editorconfig.
 * @returns A single root options object where oxfmt takes precedence.
 */
export function mergeRootOptions(
  oxfmtConfig: OxfmtOptions,
  editorconfigRootOptions: EditorconfigOptions,
) {
  return {
    ...editorconfigRootOptions,
    ...oxfmtConfig,
  }
}

/**
 * Merges EditorConfig-derived overrides with explicit oxfmt overrides.
 *
 * @param oxfmtOverrides - Overrides declared in the oxfmt config.
 * @param editorconfigOverrides - Overrides derived from .editorconfig sections.
 * @returns The merged overrides array, or undefined when no overrides exist.
 */
export function mergeOverrides(
  oxfmtOverrides: OxfmtConfigOverride[] | undefined,
  editorconfigOverrides: OxfmtConfigOverride[],
) {
  const mergedOverrides = [...editorconfigOverrides, ...(oxfmtOverrides || [])]
  return mergedOverrides.length > 0 ? mergedOverrides : undefined
}

/**
 * Resolves the nearest .editorconfig file starting from a directory and optionally walking upward.
 *
 * @param startDir - The directory where the search starts.
 * @param onlyCwd - When true, only checks the starting directory.
 * @returns The resolved .editorconfig path, or undefined when none is found.
 */
export async function resolveEditorconfigPath(
  startDir: string,
  onlyCwd = false,
) {
  let currentDir = startDir

  while (true) {
    const editorconfigPath = join(currentDir, EDITORCONFIG_FILE)

    try {
      const stats = await stat(editorconfigPath)
      if (stats.isFile()) {
        return editorconfigPath
      }
    } catch {
      // File does not exist, continue searching.
    }

    if (onlyCwd) {
      break
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
 * Normalizes a file path to POSIX separators for glob compatibility.
 *
 * @param path - The path to normalize.
 * @returns The path with forward slashes.
 */
function toPosixPath(path: string) {
  return path.replaceAll('\\', '/')
}

/**
 * Checks whether an EditorConfig section should be treated as a global section.
 *
 * @param sectionName - The section name parsed from .editorconfig.
 * @returns True when the section applies globally.
 */
function isEditorconfigGlobalSection(sectionName: SectionName) {
  return Boolean(
    sectionName && EDITORCONFIG_GLOBAL_SECTION_NAMES.includes(sectionName),
  )
}

/**
 * Parses an EditorConfig boolean string.
 *
 * @param value - The raw EditorConfig value.
 * @returns The parsed boolean, or undefined when the value is unsupported.
 */
function parseEditorconfigBoolean(value: string | undefined) {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return undefined
}

/**
 * Parses the end-of-line style supported by oxfmt.
 *
 * @param value - The raw EditorConfig end_of_line value.
 * @returns The normalized line ending value, or undefined when unsupported.
 */
function parseEditorconfigEndOfLine(value: string | undefined) {
  if (value === 'lf' || value === 'crlf' || value === 'cr') {
    return value
  }

  return undefined
}

/**
 * Parses the single quote preference from an EditorConfig section.
 *
 * @param value - The raw EditorConfig value for single quote preference.
 * @returns True if single quotes are preferred, false if double quotes are preferred, or undefined when auto.
 */
function parseEditorconfigQuoteType(value: string | undefined) {
  if (value === 'single') {
    return true
  }
  if (value === 'double') {
    return false
  }

  // auto or undefined
  return undefined
}

/**
 * Resolves the effective tab width from an EditorConfig section.
 *
 * @param section - The parsed EditorConfig section body.
 * @param useTabs - The resolved indent style from the same section, when available.
 * @returns The resolved tab width, or undefined when no numeric value is available.
 */
function parseEditorconfigTabWidth(
  section: SectionBody,
  useTabs: boolean | undefined,
) {
  const indentSize = section['indent_size']
  const tabWidth = section['tab_width']

  if (
    useTabs === false &&
    indentSize &&
    indentSize !== 'unset' &&
    indentSize !== 'tab'
  ) {
    const parsedIndentSize = Number(indentSize)
    if (Number.isFinite(parsedIndentSize)) {
      return parsedIndentSize
    }
  }

  if (tabWidth && tabWidth !== 'unset') {
    const parsedTabWidth = Number(tabWidth)
    if (Number.isFinite(parsedTabWidth)) {
      return parsedTabWidth
    }
  }

  return undefined
}

/**
 * Maps a parsed EditorConfig section to the subset of oxfmt formatter options it supports.
 *
 * @param section - The parsed EditorConfig section body.
 * @returns Formatter options derived from the section.
 */
function mapEditorconfigSectionToOptions(
  section: SectionBody,
): EditorconfigOptions {
  const options: EditorconfigOptions = {}

  const endOfLine = parseEditorconfigEndOfLine(section['end_of_line'])
  if (endOfLine) {
    options.endOfLine = endOfLine
  }

  if (section['indent_style'] === 'tab') {
    options.useTabs = true
  } else if (section['indent_style'] === 'space') {
    options.useTabs = false
  }

  const singleQuote = parseEditorconfigQuoteType(section['quote_type'])
  if (isBoolean(singleQuote)) {
    options.singleQuote = singleQuote
  }

  const tabWidth = parseEditorconfigTabWidth(section, options.useTabs)
  if (isNumber(tabWidth)) {
    options.tabWidth = tabWidth
  }

  if (section['max_line_length'] && section['max_line_length'] !== 'unset') {
    const parsedPrintWidth = Number(section['max_line_length'])
    if (Number.isFinite(parsedPrintWidth)) {
      options.printWidth = parsedPrintWidth
    }
  }

  const insertFinalNewline = parseEditorconfigBoolean(
    section['insert_final_newline'],
  )
  if (isBoolean(insertFinalNewline)) {
    options.insertFinalNewline = insertFinalNewline
  }

  return options
}

/**
 * Rebases an EditorConfig section pattern from the config directory to the target anchor directory.
 *
 * @param pattern - The original EditorConfig section pattern.
 * @param editorconfigDir - The directory containing the .editorconfig file.
 * @param anchorDir - The directory used as the override pattern base.
 * @returns The rebased glob pattern.
 */
function rebaseEditorconfigPattern(
  pattern: string,
  editorconfigDir: string,
  anchorDir: string,
) {
  const relativePrefix = toPosixPath(relative(anchorDir, editorconfigDir))
  if (!relativePrefix || relativePrefix === '.') {
    return pattern
  }

  return `${relativePrefix}/${pattern.replace(/^\//u, '')}`
}

/**
 * Reads a .editorconfig file and converts it into root options and override entries.
 *
 * @param editorconfigPath - The absolute path to the .editorconfig file.
 * @param anchorDir - The directory used to rebase section patterns.
 * @returns Parsed EditorConfig data ready to merge into oxfmt config.
 */
export async function readEditorconfigFromFile(
  editorconfigPath: string,
  anchorDir: string,
): Promise<EditorconfigData> {
  const content = await readFile(editorconfigPath)
  const parsedSections = parseBuffer(content)
  const editorconfigDir = dirname(editorconfigPath)
  const rootOptions: EditorconfigOptions = {}
  const overrides: OxfmtConfigOverride[] = []

  for (const [sectionName, sectionBody] of parsedSections) {
    if (!sectionName) {
      continue
    }

    const mappedOptions = mapEditorconfigSectionToOptions(sectionBody)
    if (Object.keys(mappedOptions).length === 0) {
      continue
    }

    if (isEditorconfigGlobalSection(sectionName)) {
      Object.assign(rootOptions, mappedOptions)
      continue
    }

    overrides.push({
      files: [
        rebaseEditorconfigPattern(sectionName, editorconfigDir, anchorDir),
      ],
      options: mappedOptions,
    })
  }

  return {
    overrides,
    rootOptions,
  }
}
