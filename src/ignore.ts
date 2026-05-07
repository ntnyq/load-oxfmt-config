import { readFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import process from 'node:process'
import ignore from 'ignore'
import type { Ignore } from 'ignore'
import picomatch from 'picomatch'
import {
  DEFAULT_IGNORE_FILES,
  DEFAULT_IGNORED_DIRS,
  DEFAULT_IGNORED_LOCKFILES,
} from './constants'
import { loadOxfmtConfigResult } from './core'
import type { IsOxfmtIgnoredOptions, IsOxfmtIgnoredResult } from './types'
import { cachePromise, splitPathSegments, toPosixPath } from './utils'

const ignoreMatcherCache = new Map<string, Promise<Ignore | undefined>>()

/**
 * Check whether a file is under oxfmt's default ignored directories.
 *
 * @param filepath - Absolute file path to test.
 * @param options - Matching options.
 * @returns True when the path should be ignored by default directory rules.
 */
function isDefaultIgnoredDir(
  filepath: string,
  options: { withNodeModules?: boolean },
) {
  const directories = options.withNodeModules
    ? DEFAULT_IGNORED_DIRS.filter(dir => dir !== 'node_modules')
    : DEFAULT_IGNORED_DIRS
  const segments = splitPathSegments(dirname(filepath))

  return directories.some(dir => segments.includes(dir))
}

/**
 * Check whether a file is a default ignored lockfile.
 *
 * @param filepath - Absolute file path.
 * @returns True when the basename matches a default lockfile name.
 */
function isLockfile(filepath: string) {
  return DEFAULT_IGNORED_LOCKFILES.includes(basename(filepath))
}

/**
 * Read and parse an ignore file into an `ignore` matcher.
 *
 * @param ignoreFilePath - Ignore file path.
 * @param useCache - Whether to cache matcher instances.
 * @returns Parsed matcher, or undefined when file does not exist.
 */
function loadIgnoreMatcher(
  ignoreFilePath: string,
  useCache: boolean,
): Promise<Ignore | undefined> {
  const loadTask = () =>
    readFile(ignoreFilePath, 'utf8')
      .then(content => {
        const ig = ignore()
        ig.add(content)
        return ig
      })
      .catch(error => {
        const code = (error as NodeJS.ErrnoException).code
        if (code === 'ENOENT' || code === 'ENOTDIR') {
          return undefined
        }

        throw error
      })

  if (!useCache) {
    return loadTask()
  }

  return cachePromise(ignoreMatcherCache, ignoreFilePath, loadTask)
}

/**
 * Build a POSIX relative path.
 *
 * @param from - Base directory.
 * @param to - Target path.
 * @returns POSIX relative path.
 */
function relativeSafe(from: string, to: string) {
  return toPosixPath(relative(from, to))
}

/**
 * Match file path against one ignore file.
 *
 * @param filepath - Absolute file path.
 * @param ignoreFilePath - Ignore file path.
 * @param useCache - Whether to use matcher cache.
 * @returns True when ignored by this file.
 */
async function matchIgnoreFile(
  filepath: string,
  ignoreFilePath: string,
  useCache: boolean,
) {
  const matcher = await loadIgnoreMatcher(ignoreFilePath, useCache)
  if (!matcher) {
    return false
  }

  const relativeToIgnore = relativeSafe(dirname(ignoreFilePath), filepath)
  if (relativeToIgnore === '..' || relativeToIgnore.startsWith('../')) {
    return false
  }

  return matcher.ignores(relativeToIgnore)
}

/**
 * Resolve an ignore file path against cwd when needed.
 *
 * @param path - Absolute or relative path.
 * @param cwd - Current working directory.
 * @returns Absolute ignore file path.
 */
function resolveIgnoreFilePath(path: string, cwd: string) {
  return isAbsolute(path) ? path : resolve(cwd, path)
}

/**
 * Match `ignorePatterns` from config with support for negated patterns.
 *
 * @param filepath - Absolute file path.
 * @param configDir - Resolved config directory.
 * @param patterns - Config ignore patterns.
 * @returns True when patterns mark the file as ignored.
 */
function matchConfigIgnorePatterns(
  filepath: string,
  configDir: string,
  patterns: string[],
) {
  const relativeFile = relativeSafe(configDir, filepath)
  let ignored = false

  for (const rawPattern of patterns) {
    if (!rawPattern) {
      continue
    }

    const isNegative = rawPattern.startsWith('!')
    const pattern = isNegative ? rawPattern.slice(1) : rawPattern
    if (!pattern) {
      continue
    }

    const matcher = picomatch(pattern, { dot: true })
    if (matcher(relativeFile)) {
      ignored = !isNegative
    }
  }

  return ignored
}

/**
 * Resolve whether a file should be ignored using oxfmt-like CLI semantics.
 *
 * @param options - Ignore resolution options.
 * @returns Ignore status with optional reason.
 *
 * @example
 * ```ts
 * import { isOxfmtIgnored } from 'load-oxfmt-config'
 *
 * const result = await isOxfmtIgnored({
 *   cwd: process.cwd(),
 *   filepath: 'src/generated/file.ts',
 * })
 * ```
 */
export async function isOxfmtIgnored(
  options: IsOxfmtIgnoredOptions,
): Promise<IsOxfmtIgnoredResult> {
  const useCache = options.useCache !== false
  const cwd = resolve(options.cwd ?? process.cwd())
  const filepath = isAbsolute(options.filepath)
    ? resolve(options.filepath)
    : resolve(cwd, options.filepath)

  const defaultIgnoredDirOptions = options.withNodeModules
    ? { withNodeModules: true }
    : {}

  if (isDefaultIgnoredDir(filepath, defaultIgnoredDirOptions)) {
    return { ignored: true, reason: 'default-dir' }
  }

  if (isLockfile(filepath)) {
    return { ignored: true, reason: 'lockfile' }
  }

  const normalizedIgnorePaths =
    typeof options.ignorePath === 'string'
      ? [options.ignorePath]
      : options.ignorePath
  const explicitIgnorePaths = normalizedIgnorePaths?.map(path =>
    resolveIgnoreFilePath(path, cwd),
  )

  if (explicitIgnorePaths && explicitIgnorePaths.length > 0) {
    for (const ignoreFilePath of explicitIgnorePaths) {
      if (await matchIgnoreFile(filepath, ignoreFilePath, useCache)) {
        return { ignored: true, reason: 'ignore-path' }
      }
    }
  } else {
    for (const ignoreFile of DEFAULT_IGNORE_FILES) {
      const ignorePath = resolve(cwd, ignoreFile)
      if (await matchIgnoreFile(filepath, ignorePath, useCache)) {
        return {
          ignored: true,
          reason: ignoreFile === '.gitignore' ? 'gitignore' : 'prettierignore',
        }
      }
    }
  }

  const configResult = await loadOxfmtConfigResult({
    cwd:
      options.configPath || options.disableNestedConfig
        ? cwd
        : dirname(filepath),
    ...(options.configPath ? { configPath: options.configPath } : {}),
    editorconfig: false,
    useCache,
  })

  if (
    configResult.dirname &&
    configResult.config.ignorePatterns &&
    configResult.config.ignorePatterns.length > 0 &&
    matchConfigIgnorePatterns(
      filepath,
      configResult.dirname,
      configResult.config.ignorePatterns,
    )
  ) {
    return { ignored: true, reason: 'config-ignore-patterns' }
  }

  return { ignored: false }
}
