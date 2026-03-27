import { readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative } from 'node:path'
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
  'endOfLine' | 'insertFinalNewline' | 'printWidth' | 'tabWidth' | 'useTabs'
>

export interface EditorconfigData {
  overrides: OxfmtConfigOverride[]
  rootOptions: EditorconfigOptions
}

export function getEditorconfigResolveCacheKey(resolveKey: string) {
  return `editorconfig::${resolveKey}`
}

export function getEditorconfigSearchDir(cwd: string, configPath?: string) {
  if (!configPath) {
    return cwd
  }

  const resolvedConfigPath = isAbsolute(configPath)
    ? configPath
    : join(cwd, configPath)
  return dirname(resolvedConfigPath)
}

export function mergeRootOptions(
  oxfmtConfig: OxfmtOptions,
  editorconfigRootOptions: EditorconfigOptions,
) {
  return {
    ...editorconfigRootOptions,
    ...oxfmtConfig,
  }
}

export function mergeOverrides(
  oxfmtOverrides: OxfmtConfigOverride[] | undefined,
  editorconfigOverrides: OxfmtConfigOverride[],
) {
  const mergedOverrides = [...editorconfigOverrides, ...(oxfmtOverrides || [])]
  return mergedOverrides.length > 0 ? mergedOverrides : undefined
}

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

function toPosixPath(path: string) {
  return path.replaceAll('\\', '/')
}

function isEditorconfigGlobalSection(sectionName: SectionName) {
  return Boolean(
    sectionName && EDITORCONFIG_GLOBAL_SECTION_NAMES.includes(sectionName),
  )
}

function parseEditorconfigBoolean(value: string | undefined) {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return undefined
}

function parseEditorconfigEndOfLine(value: string | undefined) {
  if (value === 'lf' || value === 'crlf' || value === 'cr') {
    return value
  }

  return undefined
}

function parseEditorconfigTabWidth(section: SectionBody) {
  const indentSize = section['indent_size']
  const tabWidth = section['tab_width']

  if (indentSize && indentSize !== 'unset' && indentSize !== 'tab') {
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

  const tabWidth = parseEditorconfigTabWidth(section)
  if (typeof tabWidth === 'number') {
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
  if (typeof insertFinalNewline === 'boolean') {
    options.insertFinalNewline = insertFinalNewline
  }

  return options
}

function rebaseEditorconfigPattern(
  pattern: string,
  editorconfigDir: string,
  anchorDir: string,
) {
  const relativePrefix = toPosixPath(relative(anchorDir, editorconfigDir))
  if (!relativePrefix || relativePrefix === '.') {
    return pattern
  }

  return `${relativePrefix}/${pattern.replace(/^\//, '')}`
}

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
