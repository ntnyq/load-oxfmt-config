import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadOxfmtConfig, resolveOxfmtrcPath } from '../src'

const testsDir = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(testsDir, 'fixtures')

function fixturePath(...segments: string[]) {
  return join(fixturesDir, ...segments)
}

describe(resolveOxfmtrcPath, () => {
  it('uses explicit configPath relative to cwd', async () => {
    const cwd = fixturePath('resolve', 'explicit-relative')
    const configPath = '.oxfmtrc.json'
    const expectedPath = join(cwd, configPath)

    const resolved = await resolveOxfmtrcPath(cwd, configPath)

    expect(resolved).toBe(expectedPath)
  })

  it('walks up directories to find config files', async () => {
    const root = fixturePath('resolve', 'walk-up')
    const parent = join(root, 'parent')
    const child = join(parent, 'child')
    const configPath = join(parent, '.oxfmtrc.json')

    const resolved = await resolveOxfmtrcPath(child)

    expect(resolved).toBe(configPath)
  })

  it('resolves nearest fixture config from nested directory', async () => {
    const nested = fixturePath('resolve', 'no-config', 'nested')
    const expected = fixturePath('resolve', 'no-config', '.oxfmtrc.json')

    const resolved = await resolveOxfmtrcPath(nested)

    expect(resolved).toBe(expected)
  })

  it('returns absolute configPath unchanged', async () => {
    const cwd = fixturePath('resolve', 'absolute')
    const absoluteConfig = join(cwd, '.oxfmtrc.json')

    const resolved = await resolveOxfmtrcPath(cwd, absoluteConfig)

    expect(resolved).toBe(absoluteConfig)
  })
})

describe(loadOxfmtConfig, () => {
  it('returns empty object when config is missing', async () => {
    const cwd = fixturePath('load', 'missing')

    const config = await loadOxfmtConfig({ cwd })

    expect(config).toEqual({})
  })

  it('loads JSON config when configPath is provided', async () => {
    const cwd = fixturePath('load', 'json')
    const configPath = '.oxfmtrc.json'

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config).toEqual({ printWidth: 80, semi: false })
  })

  it('parses JSONC config files', async () => {
    const cwd = fixturePath('load', 'jsonc')
    const configPath = '.oxfmtrc.jsonc'

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config).toEqual({ singleQuote: true, tabWidth: 4 })
  })

  it('throws a helpful error when JSON is invalid', async () => {
    const cwd = fixturePath('load', 'invalid-json')
    const configPath = '.oxfmtrc.json'

    await expect(loadOxfmtConfig({ configPath, cwd })).rejects.toThrow(
      /Failed to parse oxfmt configuration file/,
    )
  })

  it('returns cached config when useCache is enabled', async () => {
    const cwd = fixturePath('load', 'cache-enabled')
    const configPath = '.oxfmtrc.json'

    const first = await loadOxfmtConfig({ configPath, cwd })
    const cached = await loadOxfmtConfig({ configPath, cwd })

    expect(cached).toBe(first)
  })

  it('bypasses cache when useCache is false', async () => {
    const cwd = fixturePath('load', 'cache-bypass')
    const configPath = '.oxfmtrc.json'

    const cached = await loadOxfmtConfig({ configPath, cwd })

    const fresh = await loadOxfmtConfig({ configPath, cwd, useCache: false })

    expect(fresh).toEqual({ tabWidth: 2, useTabs: false })
    expect(fresh).not.toBe(cached)
  })

  it('loads config using absolute configPath', async () => {
    const cwd = fixturePath('load', 'absolute')
    const absoluteConfig = join(cwd, '.oxfmtrc.json')

    const config = await loadOxfmtConfig({ configPath: absoluteConfig, cwd })

    expect(config).toEqual({ semi: false, tabWidth: 2 })
  })

  it('loads config with ignorePatterns array', async () => {
    const cwd = fixturePath('load', 'ignore-patterns')
    const configPath = '.oxfmtrc.json'

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toEqual([
      '*.test.ts',
      'dist/**',
      'node_modules/**',
    ])
    expect(config.printWidth).toBe(80)
  })

  it('loads config with empty ignorePatterns array', async () => {
    const cwd = fixturePath('load', 'ignore-empty')
    const configPath = '.oxfmtrc.json'

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toEqual([])
    expect(config.printWidth).toBe(100)
  })

  it('loads config without ignorePatterns field', async () => {
    const cwd = fixturePath('load', 'no-ignore')
    const configPath = '.oxfmtrc.json'

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toBeUndefined()
    expect(config.printWidth).toBe(80)
  })

  it('parses ignorePatterns from JSONC config files', async () => {
    const cwd = fixturePath('load', 'jsonc-ignore')
    const configPath = '.oxfmtrc.jsonc'

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toEqual(['**/*.test.ts'])
    expect(config.semi).toBeTruthy()
  })

  it('loads config with ignorePatterns and overrides together', async () => {
    const cwd = fixturePath('load', 'ignore-overrides')
    const configPath = '.oxfmtrc.json'

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toEqual(['dist/**', 'build/**'])
    expect(config.overrides).toBeDefined()
    expect(config.overrides?.[0]!.files).toEqual(['src/**/*.ts'])
  })

  it('preserves ignorePatterns with cache enabled', async () => {
    const cwd = fixturePath('load', 'ignore-cache')
    const configPath = '.oxfmtrc.json'

    const first = await loadOxfmtConfig({ configPath, cwd })
    const cached = await loadOxfmtConfig({ configPath, cwd })

    expect(cached).toBe(first)
    expect(cached.ignorePatterns).toEqual(first.ignorePatterns)
    expect(cached.ignorePatterns).toEqual(['*.tmp'])
  })

  it('loads oxfmt.config.ts with default export', async () => {
    const cwd = fixturePath('load', 'ts-default')
    const configPath = 'oxfmt.config.ts'

    const config = await loadOxfmtConfig({ configPath, cwd, useCache: false })

    expect(config).toEqual({ printWidth: 100, tabWidth: 4 })
  })

  it('loads oxfmt.config.ts with ignorePatterns', async () => {
    const cwd = fixturePath('load', 'ts-ignore')
    const configPath = 'oxfmt.config.ts'

    const config = await loadOxfmtConfig({ configPath, cwd, useCache: false })

    expect(config.printWidth).toBe(80)
    expect(config.ignorePatterns).toEqual(['dist/**', 'node_modules/**'])
  })

  it('auto-discovers oxfmt.config.ts after JSON configs', async () => {
    const cwd = fixturePath('load', 'auto-discover')

    const config = await loadOxfmtConfig({ cwd, useCache: false })

    expect(config.tabWidth).toBe(2)
  })

  it('loads .editorconfig root options with local empty oxfmt config', async () => {
    const cwd = fixturePath('load', 'editor-root')

    const config = await loadOxfmtConfig({ cwd, useCache: false })

    expect(config).toEqual({
      endOfLine: 'crlf',
      insertFinalNewline: false,
      printWidth: 90,
      tabWidth: 4,
      useTabs: false,
    })
  })

  it('uses .oxfmtrc root fields over .editorconfig fallback values', async () => {
    const cwd = fixturePath('load', 'editor-fallback')

    const config = await loadOxfmtConfig({ cwd, useCache: false })

    expect(config.printWidth).toBe(120)
    expect(config.useTabs).toBeFalsy()
    expect(config.tabWidth).toBe(8)
  })

  it('converts .editorconfig sections into low-priority overrides', async () => {
    const cwd = fixturePath('load', 'editor-overrides')

    const config = await loadOxfmtConfig({ cwd, useCache: false })

    expect(config.tabWidth).toBe(2)
    expect(config.overrides).toEqual([
      {
        files: ['*.ts'],
        options: { tabWidth: 4 },
      },
      {
        files: ['*.md'],
        options: { printWidth: 72 },
      },
      {
        files: ['src/**/*.ts'],
        options: { printWidth: 100 },
      },
    ])
  })

  it('uses the nearest .editorconfig when multiple files exist', async () => {
    const root = fixturePath('load', 'editor-nearest', 'root')
    const child = join(root, 'packages', 'app')

    const config = await loadOxfmtConfig({ cwd: child, useCache: false })

    expect(config.tabWidth).toBe(2)
    expect(config.useTabs).toBeTruthy()
  })

  it('rebases .editorconfig overrides to the discovered oxfmt config directory', async () => {
    const root = fixturePath('load', 'editor-rebase', 'root')
    const child = join(root, 'packages', 'app')

    const config = await loadOxfmtConfig({ cwd: child, useCache: false })

    expect(config.semi).toBeFalsy()
    expect(config.tabWidth).toBe(2)
    expect(config.overrides).toEqual([
      {
        files: ['packages/app/src/**/*.ts'],
        options: { printWidth: 120 },
      },
    ])
  })

  it('preserves cached .editorconfig results until cache is bypassed', async () => {
    const cwd = fixturePath('load', 'editor-cache')

    const first = await loadOxfmtConfig({ cwd })

    const cached = await loadOxfmtConfig({ cwd })
    const fresh = await loadOxfmtConfig({ cwd, useCache: false })

    expect(first.tabWidth).toBe(2)
    expect(cached.tabWidth).toBe(2)
    expect(cached).toBe(first)
    expect(fresh).not.toBe(first)
    expect(fresh.tabWidth).toBe(2)
  })

  it('skips .editorconfig entirely when editorconfig is false', async () => {
    const cwd = fixturePath('load', 'editor-root')

    const config = await loadOxfmtConfig({
      cwd,
      editorconfig: false,
      useCache: false,
    })

    expect(config).toEqual({})
  })

  it('finds .editorconfig in cwd when onlyCwd is true', async () => {
    const cwd = fixturePath('load', 'editor-root')

    const config = await loadOxfmtConfig({
      cwd,
      editorconfig: { onlyCwd: true },
      useCache: false,
    })

    expect(config).toEqual({
      endOfLine: 'crlf',
      insertFinalNewline: false,
      printWidth: 90,
      tabWidth: 4,
      useTabs: false,
    })
  })

  it('does not walk up to parent .editorconfig when onlyCwd is true', async () => {
    const root = fixturePath('load', 'editor-option', 'root')
    const child = join(root, 'packages', 'app')

    const withWalk = await loadOxfmtConfig({ cwd: child, useCache: false })
    const withoutWalk = await loadOxfmtConfig({
      cwd: child,
      editorconfig: { onlyCwd: true },
      useCache: false,
    })

    expect(withWalk.tabWidth).toBe(4)
    expect(withoutWalk).toEqual({})
  })

  it('resolves .editorconfig from editorconfig.cwd instead of config directory', async () => {
    const cwd = fixturePath('load', 'editor-cwd')
    const editorconfigDir = join(cwd, 'alt')

    const config = await loadOxfmtConfig({
      cwd,
      editorconfig: { cwd: editorconfigDir },
      useCache: false,
    })

    expect(config.semi).toBeTruthy()
    expect(config.tabWidth).toBe(8)
    expect(config.printWidth).toBe(120)
  })

  it('does not use editorconfig.cwd directory when editorconfig.cwd is not set', async () => {
    const cwd = fixturePath('load', 'editor-cwd')

    const config = await loadOxfmtConfig({
      cwd,
      useCache: false,
    })

    expect(config.semi).toBeTruthy()
    expect(config.tabWidth).toBeUndefined()
    expect(config.printWidth).toBeUndefined()
  })
})
