import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadOxfmtConfig, resolveOxfmtrcPath } from '../src'

const tempRoots: string[] = []

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'oxfmt-config-'))
  tempRoots.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(dir => rm(dir, { force: true, recursive: true })),
  )
})

describe(resolveOxfmtrcPath, () => {
  it('uses explicit configPath relative to cwd', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'
    const expectedPath = join(cwd, configPath)

    await writeFile(expectedPath, '{}')

    const resolved = await resolveOxfmtrcPath(cwd, configPath)

    expect(resolved).toBe(expectedPath)
  })

  it('walks up directories to find config files', async () => {
    const root = await createTempDir()
    const parent = join(root, 'parent')
    const child = join(parent, 'child')
    const configPath = join(parent, '.oxfmtrc.json')

    await mkdir(child, { recursive: true })
    await writeFile(configPath, '{}')

    const resolved = await resolveOxfmtrcPath(child)

    expect(resolved).toBe(configPath)
  })

  it('returns undefined when no config exists in any ancestor', async () => {
    const cwd = await createTempDir()
    const nested = join(cwd, 'nested')

    await mkdir(nested, { recursive: true })

    const resolved = await resolveOxfmtrcPath(nested)

    expect(resolved).toBeUndefined()
  })

  it('returns absolute configPath unchanged', async () => {
    const cwd = await createTempDir()
    const absoluteConfig = join(cwd, '.oxfmtrc.json')

    await writeFile(absoluteConfig, '{}')

    const resolved = await resolveOxfmtrcPath(cwd, absoluteConfig)

    expect(resolved).toBe(absoluteConfig)
  })
})

describe(loadOxfmtConfig, () => {
  it('returns empty object when config is missing', async () => {
    const cwd = await createTempDir()

    const config = await loadOxfmtConfig({ cwd })

    expect(config).toEqual({})
  })

  it('loads JSON config when configPath is provided', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'
    const configContent = { printWidth: 80, semi: false }

    await writeFile(join(cwd, configPath), JSON.stringify(configContent))

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config).toEqual(configContent)
  })

  it('parses JSONC config files', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.jsonc'
    const configContent = '{//comment\n"singleQuote":true,\n"tabWidth":4\n}'

    await writeFile(join(cwd, configPath), configContent)

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config).toEqual({ singleQuote: true, tabWidth: 4 })
  })

  it('throws a helpful error when JSON is invalid', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'

    await writeFile(join(cwd, configPath), '{ invalid json }')

    await expect(loadOxfmtConfig({ configPath, cwd })).rejects.toThrow(
      /Failed to parse oxfmt configuration file/,
    )
  })

  it('returns cached config when useCache is enabled', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'

    await writeFile(
      join(cwd, configPath),
      JSON.stringify({ printWidth: 80, semi: false }),
    )

    const first = await loadOxfmtConfig({ configPath, cwd })

    await writeFile(
      join(cwd, configPath),
      JSON.stringify({ printWidth: 120, semi: true }),
    )

    const cached = await loadOxfmtConfig({ configPath, cwd })

    expect(cached).toEqual(first)
  })

  it('bypasses cache when useCache is false', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'

    await writeFile(
      join(cwd, configPath),
      JSON.stringify({ tabWidth: 2, useTabs: false }),
    )

    await loadOxfmtConfig({ configPath, cwd })

    await writeFile(
      join(cwd, configPath),
      JSON.stringify({ tabWidth: 4, useTabs: true }),
    )

    const fresh = await loadOxfmtConfig({ configPath, cwd, useCache: false })

    expect(fresh).toEqual({ tabWidth: 4, useTabs: true })
  })

  it('loads config using absolute configPath', async () => {
    const cwd = await createTempDir()
    const absoluteConfig = join(cwd, '.oxfmtrc.json')
    const configContent = { semi: false, tabWidth: 2 }

    await writeFile(absoluteConfig, JSON.stringify(configContent))

    const config = await loadOxfmtConfig({ configPath: absoluteConfig, cwd })

    expect(config).toEqual(configContent)
  })

  it('loads config with ignorePatterns array', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'
    const configContent = {
      printWidth: 80,
      ignorePatterns: ['*.test.ts', 'dist/**', 'node_modules/**'],
    }

    await writeFile(join(cwd, configPath), JSON.stringify(configContent))

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toEqual([
      '*.test.ts',
      'dist/**',
      'node_modules/**',
    ])
    expect(config.printWidth).toBe(80)
  })

  it('loads config with empty ignorePatterns array', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'
    const configContent = {
      printWidth: 100,
      ignorePatterns: [],
    }

    await writeFile(join(cwd, configPath), JSON.stringify(configContent))

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toEqual([])
    expect(config.printWidth).toBe(100)
  })

  it('loads config without ignorePatterns field', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'
    const configContent = { printWidth: 80, semi: false }

    await writeFile(join(cwd, configPath), JSON.stringify(configContent))

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toBeUndefined()
    expect(config.printWidth).toBe(80)
  })

  it('parses ignorePatterns from JSONC config files', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.jsonc'
    const configContent =
      '{\n// Ignore test files\n"ignorePatterns":["**/*.test.ts"],\n"semi":true\n}'

    await writeFile(join(cwd, configPath), configContent)

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toEqual(['**/*.test.ts'])
    expect(config.semi).toBeTruthy()
  })

  it('loads config with ignorePatterns and overrides together', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'
    const configContent = {
      ignorePatterns: ['dist/**', 'build/**'],
      overrides: [
        {
          files: ['src/**/*.ts'],
          options: { printWidth: 100 },
        },
      ],
    }

    await writeFile(join(cwd, configPath), JSON.stringify(configContent))

    const config = await loadOxfmtConfig({ configPath, cwd })

    expect(config.ignorePatterns).toEqual(['dist/**', 'build/**'])
    expect(config.overrides).toBeDefined()
    expect(config.overrides?.[0]!.files).toEqual(['src/**/*.ts'])
  })

  it('preserves ignorePatterns with cache enabled', async () => {
    const cwd = await createTempDir()
    const configPath = '.oxfmtrc.json'
    const configContent = {
      ignorePatterns: ['*.tmp'],
      printWidth: 80,
    }

    await writeFile(join(cwd, configPath), JSON.stringify(configContent))

    const first = await loadOxfmtConfig({ configPath, cwd })

    // Read again with cache enabled (default)
    const cached = await loadOxfmtConfig({ configPath, cwd })

    expect(cached.ignorePatterns).toEqual(first.ignorePatterns)
    expect(cached.ignorePatterns).toEqual(['*.tmp'])
  })
})
