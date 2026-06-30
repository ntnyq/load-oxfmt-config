import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadOxfmtConfig } from '../src'
import { fixturePath, withTempDir } from './helpers'

describe(loadOxfmtConfig, () => {
  describe('basic loading', () => {
    it('returns empty object when config is missing', async () => {
      const cwd = fixturePath('load', 'missing')

      const result = await loadOxfmtConfig({ cwd })

      expect(result.config).toStrictEqual({})
    })

    it('loads JSON config when configPath is provided', async () => {
      const cwd = fixturePath('load', 'json')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config).toStrictEqual({ printWidth: 80, semi: false })
    })

    it('parses JSONC config files', async () => {
      const cwd = fixturePath('load', 'jsonc')
      const configPath = '.oxfmtrc.jsonc'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config).toStrictEqual({ singleQuote: true, tabWidth: 4 })
    })

    it('throws a helpful error when JSON is invalid', async () => {
      const cwd = fixturePath('load', 'invalid-json')
      const configPath = '.oxfmtrc.json'

      await expect(loadOxfmtConfig({ configPath, cwd })).rejects.toThrow(
        /Failed to parse oxfmt configuration file/u,
      )
    })

    it('loads config using absolute configPath', async () => {
      const cwd = fixturePath('load', 'absolute')
      const absoluteConfig = join(cwd, '.oxfmtrc.json')

      const result = await loadOxfmtConfig({ configPath: absoluteConfig, cwd })

      expect(result.config).toStrictEqual({ semi: false, tabWidth: 2 })
    })

    it('loads oxfmt.config.ts with default export', async () => {
      const cwd = fixturePath('load', 'ts-default')
      const configPath = 'oxfmt.config.ts'

      const result = await loadOxfmtConfig({ configPath, cwd, useCache: false })

      expect(result.config).toStrictEqual({ printWidth: 100, tabWidth: 4 })
    })

    it('loads oxfmt.config.ts with ignorePatterns', async () => {
      const cwd = fixturePath('load', 'ts-ignore')
      const configPath = 'oxfmt.config.ts'

      const result = await loadOxfmtConfig({ configPath, cwd, useCache: false })

      expect(result.config.printWidth).toBe(80)
      expect(result.config.ignorePatterns).toStrictEqual([
        'dist/**',
        'node_modules/**',
      ])
    })

    it('loads explicit .mts config path', async () => {
      await withTempDir('oxfmt-config-explicit-mts-', async cwd => {
        const configPath = join(cwd, 'custom.config.mts')
        await writeFile(
          configPath,
          'export default { printWidth: 88 }\n',
          'utf8',
        )

        const result = await loadOxfmtConfig({
          cwd,
          configPath,
          useCache: false,
          editorconfig: false,
        })

        expect(result.config.printWidth).toBe(88)
      })
    })

    it('loads explicit .cjs config path', async () => {
      await withTempDir('oxfmt-config-explicit-cjs-', async cwd => {
        const configPath = join(cwd, 'custom.config.cjs')
        await writeFile(
          configPath,
          'module.exports = { printWidth: 89 }\n',
          'utf8',
        )

        const result = await loadOxfmtConfig({
          cwd,
          configPath,
          useCache: false,
          editorconfig: false,
        })

        expect(result.config.printWidth).toBe(89)
      })
    })

    it('auto-discovers oxfmt.config.ts after JSON configs', async () => {
      const cwd = fixturePath('load', 'auto-discover')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.tabWidth).toBe(2)
    })

    it('resolves nested config from filepath directory by default', async () => {
      await withTempDir('oxfmt-config-by-filepath-', async cwd => {
        const nestedDir = join(cwd, 'packages', 'app', 'src')
        await mkdir(nestedDir, { recursive: true })
        await writeFile(
          join(cwd, '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 120 }),
          'utf8',
        )
        await writeFile(
          join(cwd, 'packages', 'app', '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 90 }),
          'utf8',
        )
        await writeFile(join(nestedDir, 'a.ts'), 'export const a = 1\n', 'utf8')

        const result = await loadOxfmtConfig({
          cwd,
          filepath: join(nestedDir, 'a.ts'),
          useCache: false,
        })

        expect(result.config.printWidth).toBe(90)
      })
    })

    it('uses cwd-based config when disableNestedConfig is true', async () => {
      await withTempDir('oxfmt-config-disable-nested-', async cwd => {
        const nestedDir = join(cwd, 'packages', 'app', 'src')
        await mkdir(nestedDir, { recursive: true })
        await writeFile(
          join(cwd, '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 120 }),
          'utf8',
        )
        await writeFile(
          join(cwd, 'packages', 'app', '.oxfmtrc.json'),
          JSON.stringify({ printWidth: 90 }),
          'utf8',
        )
        await writeFile(join(nestedDir, 'a.ts'), 'export const a = 1\n', 'utf8')

        const result = await loadOxfmtConfig({
          cwd,
          filepath: join(nestedDir, 'a.ts'),
          disableNestedConfig: true,
          useCache: false,
        })

        expect(result.config.printWidth).toBe(120)
      })
    })
  })

  describe('cache behavior', () => {
    it('returns cached config when useCache is enabled', async () => {
      const cwd = fixturePath('load', 'cache-enabled')
      const configPath = '.oxfmtrc.json'

      const first = await loadOxfmtConfig({ configPath, cwd })
      const cached = await loadOxfmtConfig({ configPath, cwd })

      expect(cached.config).toBe(first.config)
    })

    it('bypasses cache when useCache is false', async () => {
      const cwd = fixturePath('load', 'cache-bypass')
      const configPath = '.oxfmtrc.json'

      const cached = await loadOxfmtConfig({ configPath, cwd })

      const fresh = await loadOxfmtConfig({ configPath, cwd, useCache: false })

      expect(fresh.config).toStrictEqual({ tabWidth: 2, useTabs: false })
      expect(fresh.config).not.toBe(cached.config)
    })

    it.each([
      {
        name: 'TypeScript config',
        filename: 'oxfmt.config.ts',
        expectedPrintWidth: 72,
        firstContent: 'export default { printWidth: 71 }\n',
        secondContent: 'export default { printWidth: 72 }\n',
      },
      {
        name: 'ESM .mjs config',
        filename: 'oxfmt.config.mjs',
        expectedPrintWidth: 74,
        firstContent: 'export default { printWidth: 73 }\n',
        secondContent: 'export default { printWidth: 74 }\n',
      },
      {
        name: 'CommonJS .js config',
        filename: 'oxfmt.config.js',
        expectedPrintWidth: 76,
        firstContent: 'module.exports = { printWidth: 75 }\n',
        secondContent: 'module.exports = { printWidth: 76 }\n',
      },
      {
        name: 'CommonJS .cjs config',
        filename: 'oxfmt.config.cjs',
        expectedPrintWidth: 78,
        firstContent: 'module.exports = { printWidth: 77 }\n',
        secondContent: 'module.exports = { printWidth: 78 }\n',
      },
    ])('reloads changed $name when useCache is false', async testCase => {
      await withTempDir('oxfmt-config-js-cache-bypass-', async cwd => {
        const configPath = join(cwd, testCase.filename)
        await writeFile(configPath, testCase.firstContent, 'utf8')

        const first = await loadOxfmtConfig({
          cwd,
          configPath,
          editorconfig: false,
          useCache: false,
        })

        await writeFile(configPath, testCase.secondContent, 'utf8')

        const second = await loadOxfmtConfig({
          cwd,
          configPath,
          editorconfig: false,
          useCache: false,
        })

        expect(second.config.printWidth).not.toBe(first.config.printWidth)
        expect(second.config.printWidth).toBe(testCase.expectedPrintWidth)
      })
    })

    it('reloads changed ESM .js config when useCache is false', async () => {
      await withTempDir('oxfmt-config-js-esm-cache-bypass-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.js')
        await writeFile(
          join(cwd, 'package.json'),
          '{"type":"module"}\n',
          'utf8',
        )
        await writeFile(
          configPath,
          'export default { printWidth: 79 }\n',
          'utf8',
        )

        const first = await loadOxfmtConfig({
          cwd,
          configPath,
          editorconfig: false,
          useCache: false,
        })

        await writeFile(
          configPath,
          'export default { printWidth: 80 }\n',
          'utf8',
        )

        const second = await loadOxfmtConfig({
          cwd,
          configPath,
          editorconfig: false,
          useCache: false,
        })

        expect(second.config.printWidth).not.toBe(first.config.printWidth)
        expect(second.config.printWidth).toBe(80)
      })
    })

    it('reloads changed CommonJS config helper when useCache is false', async () => {
      await withTempDir('oxfmt-config-cjs-helper-cache-bypass-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.cjs')
        const helperPath = join(cwd, 'shared.cjs')

        await writeFile(
          configPath,
          "module.exports = require('./shared.cjs')\n",
          'utf8',
        )
        await writeFile(helperPath, 'module.exports = { printWidth: 81 }\n')

        const first = await loadOxfmtConfig({
          cwd,
          configPath,
          editorconfig: false,
          useCache: false,
        })

        await writeFile(helperPath, 'module.exports = { printWidth: 82 }\n')

        const second = await loadOxfmtConfig({
          cwd,
          configPath,
          editorconfig: false,
          useCache: false,
        })

        expect(first.config.printWidth).toBe(81)
        expect(second.config.printWidth).toBe(82)
      })
    })

    it.each([
      { filename: 'oxfmt.config.mjs' },
      { filename: 'oxfmt.config.js' },
    ])(
      'reloads changed ESM config helper for $filename when useCache is false',
      async testCase => {
        await withTempDir(
          'oxfmt-config-esm-helper-cache-bypass-',
          async cwd => {
            const configPath = join(cwd, testCase.filename)
            const helperPath = join(cwd, 'shared.mjs')

            await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
            await writeFile(
              configPath,
              "import width from './shared.mjs'\nexport default { printWidth: width }\n",
              'utf8',
            )
            await writeFile(helperPath, 'export default 83\n', 'utf8')

            const first = await loadOxfmtConfig({
              cwd,
              configPath,
              editorconfig: false,
              useCache: false,
            })

            await writeFile(helperPath, 'export default 84\n', 'utf8')

            const second = await loadOxfmtConfig({
              cwd,
              configPath,
              editorconfig: false,
              useCache: false,
            })

            expect(first.config.printWidth).toBe(83)
            expect(second.config.printWidth).toBe(84)
          },
        )
      },
    )

    it('does not retry config evaluation errors through JavaScript fallbacks', async () => {
      await withTempDir('oxfmt-config-js-evaluation-error-', async cwd => {
        const configPath = join(cwd, 'oxfmt.config.js')
        const counterPath = join(cwd, 'counter.txt')

        await writeFile(counterPath, '0', 'utf8')
        await writeFile(
          configPath,
          [
            "const { readFileSync, writeFileSync } = require('node:fs')",
            `const counterPath = ${JSON.stringify(counterPath)}`,
            "const count = Number(readFileSync(counterPath, 'utf8'))",
            'writeFileSync(counterPath, String(count + 1))',
            "throw new Error('boom from config')",
            '',
          ].join('\n'),
          'utf8',
        )

        await expect(
          loadOxfmtConfig({
            cwd,
            configPath,
            editorconfig: false,
            useCache: false,
          }),
        ).rejects.toThrow(/boom from config/u)

        await expect(readFile(counterPath, 'utf8')).resolves.toBe('1')
      })
    })

    it('reuses unchanged native ESM config module URL when useCache is false', async () => {
      await withTempDir('oxfmt-config-js-esm-cache-key-', async cwd => {
        const globals = globalThis as typeof globalThis & {
          loadOxfmtConfigImportCount?: number
        }
        const configPath = join(cwd, 'oxfmt.config.mjs')

        globals.loadOxfmtConfigImportCount = 0

        try {
          await writeFile(
            configPath,
            [
              'globalThis.loadOxfmtConfigImportCount =',
              '  (globalThis.loadOxfmtConfigImportCount ?? 0) + 1',
              'export default { printWidth: globalThis.loadOxfmtConfigImportCount }',
              '',
            ].join('\n'),
            'utf8',
          )

          const first = await loadOxfmtConfig({
            cwd,
            configPath,
            editorconfig: false,
            useCache: false,
          })
          const second = await loadOxfmtConfig({
            cwd,
            configPath,
            editorconfig: false,
            useCache: false,
          })

          expect(first.config.printWidth).toBe(1)
          expect(second.config.printWidth).toBe(1)
          expect(globals.loadOxfmtConfigImportCount).toBe(1)
        } finally {
          delete globals.loadOxfmtConfigImportCount
        }
      })
    })

    it('preserves ignorePatterns with cache enabled', async () => {
      const cwd = fixturePath('load', 'ignore-cache')
      const configPath = '.oxfmtrc.json'

      const first = await loadOxfmtConfig({ configPath, cwd })
      const cached = await loadOxfmtConfig({ configPath, cwd })

      expect(cached.config).toBe(first.config)
      expect(cached.config.ignorePatterns).toStrictEqual(
        first.config.ignorePatterns,
      )
      expect(cached.config.ignorePatterns).toStrictEqual(['*.tmp'])
    })

    it('preserves cached .editorconfig results until cache is bypassed', async () => {
      const cwd = fixturePath('load', 'editor-cache')

      const first = await loadOxfmtConfig({ cwd })

      const cached = await loadOxfmtConfig({ cwd })
      const fresh = await loadOxfmtConfig({ cwd, useCache: false })

      expect(first.config.tabWidth).toBe(2)
      expect(cached.config.tabWidth).toBe(2)
      expect(cached.config).toBe(first.config)
      expect(fresh).not.toBe(first)
      expect(fresh.config.tabWidth).toBe(2)
    })

    it('keeps editorconfig onlyCwd cache isolated from default walking', async () => {
      await withTempDir('oxfmt-config-editor-cache-only-cwd-', async cwd => {
        const child = join(cwd, 'packages', 'app')
        await mkdir(child, { recursive: true })
        await writeFile(
          join(cwd, '.editorconfig'),
          '[*]\nindent_style = space\nindent_size = 2\n',
          'utf8',
        )
        await writeFile(join(child, '.oxfmtrc.json'), '{}\n', 'utf8')

        const withWalk = await loadOxfmtConfig({ cwd: child })
        const onlyCwd = await loadOxfmtConfig({
          cwd: child,
          editorconfig: { onlyCwd: true },
        })

        expect(withWalk.config).toStrictEqual({ tabWidth: 2, useTabs: false })
        expect(onlyCwd.config).toStrictEqual({})
      })
    })

    it('keeps default editorconfig cache isolated after onlyCwd miss', async () => {
      await withTempDir(
        'oxfmt-config-editor-cache-only-cwd-miss-',
        async cwd => {
          const child = join(cwd, 'packages', 'app')
          await mkdir(child, { recursive: true })
          await writeFile(
            join(cwd, '.editorconfig'),
            '[*]\nindent_style = space\nindent_size = 2\n',
            'utf8',
          )
          await writeFile(join(child, '.oxfmtrc.json'), '{}\n', 'utf8')

          const onlyCwd = await loadOxfmtConfig({
            cwd: child,
            editorconfig: { onlyCwd: true },
          })
          const withWalk = await loadOxfmtConfig({ cwd: child })

          expect(onlyCwd.config).toStrictEqual({})
          expect(withWalk.config).toStrictEqual({
            tabWidth: 2,
            useTabs: false,
          })
        },
      )
    })
  })

  describe('ignorePatterns handling', () => {
    it('loads config with ignorePatterns array', async () => {
      const cwd = fixturePath('load', 'ignore-patterns')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toStrictEqual([
        '*.test.ts',
        'dist/**',
        'node_modules/**',
      ])
      expect(result.config.printWidth).toBe(80)
    })

    it('loads config with empty ignorePatterns array', async () => {
      const cwd = fixturePath('load', 'ignore-empty')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toStrictEqual([])
      expect(result.config.printWidth).toBe(100)
    })

    it('loads config without ignorePatterns field', async () => {
      const cwd = fixturePath('load', 'no-ignore')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toBeUndefined()
      expect(result.config.printWidth).toBe(80)
    })

    it('parses ignorePatterns from JSONC config files', async () => {
      const cwd = fixturePath('load', 'jsonc-ignore')
      const configPath = '.oxfmtrc.jsonc'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toStrictEqual(['**/*.test.ts'])
      expect(result.config.semi).toBeTruthy()
    })

    it('loads config with ignorePatterns and overrides together', async () => {
      const cwd = fixturePath('load', 'ignore-overrides')
      const configPath = '.oxfmtrc.json'

      const result = await loadOxfmtConfig({ configPath, cwd })

      expect(result.config.ignorePatterns).toStrictEqual([
        'dist/**',
        'build/**',
      ])
      expect(result.config.overrides).toBeDefined()
      expect(result.config.overrides?.[0]!.files).toStrictEqual(['src/**/*.ts'])
    })
  })

  describe('editorconfig behavior', () => {
    it('loads .editorconfig root options with local empty oxfmt config', async () => {
      const cwd = fixturePath('load', 'editor-root')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config).toStrictEqual({
        endOfLine: 'crlf',
        insertFinalNewline: false,
        printWidth: 90,
        tabWidth: 4,
        useTabs: false,
      })
    })

    it.each([
      ['single', { singleQuote: true }],
      ['double', { singleQuote: false }],
      ['auto', {}],
      ['invalid', {}],
    ])(
      'maps .editorconfig quote_type=%s into oxfmt options',
      async (fixtureName, expected) => {
        const cwd = fixturePath('load', 'editor-quote-type', fixtureName)

        const result = await loadOxfmtConfig({ cwd, useCache: false })

        expect(result.config).toStrictEqual(expected)
      },
    )

    it('uses .oxfmtrc root fields over .editorconfig fallback values', async () => {
      const cwd = fixturePath('load', 'editor-fallback')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.printWidth).toBe(120)
      expect(result.config.useTabs).toBeFalsy()
      expect(result.config.tabWidth).toBeUndefined()
    })

    it('converts .editorconfig sections into low-priority overrides', async () => {
      const cwd = fixturePath('load', 'editor-overrides')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.tabWidth).toBeUndefined()
      expect(result.config.overrides).toStrictEqual([
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

      const result = await loadOxfmtConfig({ cwd: child, useCache: false })

      expect(result.config.tabWidth).toBeUndefined()
      expect(result.config.useTabs).toBeTruthy()
    })

    it('uses explicit tab_width when .editorconfig indent_style is tab', async () => {
      const cwd = fixturePath('load', 'editor-tab-width')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.useTabs).toBeTruthy()
      expect(result.config.tabWidth).toBe(6)
    })

    it('treats [**] sections as overrides when loading .editorconfig', async () => {
      const cwd = fixturePath('load', 'editor-double-star')

      const result = await loadOxfmtConfig({ cwd, useCache: false })

      expect(result.config.printWidth).toBeUndefined()
      expect(result.config.tabWidth).toBeUndefined()
      expect(result.config.useTabs).toBeUndefined()
      expect(result.config.overrides).toStrictEqual([
        {
          files: ['**'],
          options: {
            printWidth: 90,
            tabWidth: 3,
            useTabs: false,
          },
        },
      ])
    })

    it('rebases .editorconfig overrides to the discovered oxfmt config directory', async () => {
      const root = fixturePath('load', 'editor-rebase', 'root')
      const child = join(root, 'packages', 'app')

      const result = await loadOxfmtConfig({ cwd: child, useCache: false })

      expect(result.config.semi).toBeFalsy()
      expect(result.config.tabWidth).toBeUndefined()
      expect(result.config.overrides).toStrictEqual([
        {
          files: ['packages/app/src/**/*.ts'],
          options: { printWidth: 120 },
        },
      ])
    })

    it('skips .editorconfig entirely when editorconfig is false', async () => {
      const cwd = fixturePath('load', 'editor-root')

      const result = await loadOxfmtConfig({
        cwd,
        editorconfig: false,
        useCache: false,
      })

      expect(result.config).toStrictEqual({})
    })

    it('finds .editorconfig in cwd when onlyCwd is true', async () => {
      const cwd = fixturePath('load', 'editor-root')

      const result = await loadOxfmtConfig({
        cwd,
        editorconfig: { onlyCwd: true },
        useCache: false,
      })

      expect(result.config).toStrictEqual({
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

      expect(withWalk.config.tabWidth).toBeUndefined()
      expect(withoutWalk.config).toStrictEqual({})
    })

    it('resolves .editorconfig from editorconfig.cwd instead of config directory', async () => {
      const cwd = fixturePath('load', 'editor-cwd')
      const editorconfigDir = join(cwd, 'alt')

      const result = await loadOxfmtConfig({
        cwd,
        editorconfig: { cwd: editorconfigDir },
        useCache: false,
      })

      expect(result.config.semi).toBeTruthy()
      expect(result.config.tabWidth).toBeUndefined()
      expect(result.config.printWidth).toBe(120)
    })

    it('does not use editorconfig.cwd directory when editorconfig.cwd is not set', async () => {
      const cwd = fixturePath('load', 'editor-cwd')

      const result = await loadOxfmtConfig({
        cwd,
        useCache: false,
      })

      expect(result.config.semi).toBeTruthy()
      expect(result.config.tabWidth).toBeUndefined()
      expect(result.config.printWidth).toBeUndefined()
    })
  })

  describe('metadata', () => {
    it('returns merged config with resolved filepath and dirname', async () => {
      const cwd = fixturePath('load', 'json')

      const result = await loadOxfmtConfig({
        cwd,
        configPath: '.oxfmtrc.json',
        useCache: false,
      })

      expect(result.config).toStrictEqual({ printWidth: 80, semi: false })
      expect(result.filepath).toBe(join(cwd, '.oxfmtrc.json'))
      expect(result.dirname).toBe(cwd)
    })

    it('returns metadata as undefined when no config is found', async () => {
      await withTempDir('oxfmt-config-missing-', async cwd => {
        const result = await loadOxfmtConfig({ cwd, useCache: false })

        expect(result.config).toStrictEqual({})
        expect(result.filepath).toBeUndefined()
        expect(result.dirname).toBeUndefined()
      })
    })

    it.each([
      ['.js', 'export default { printWidth: 91 }\n', 91],
      ['.mjs', 'export default { printWidth: 92 }\n', 92],
      ['.cjs', 'module.exports = { printWidth: 93 }\n', 93],
      ['.ts', 'export default { printWidth: 94 }\n', 94],
      ['.mts', 'export default { printWidth: 95 }\n', 95],
      ['.cts', 'export default { printWidth: 96 }\n', 96],
    ])(
      'loads explicit %s config path and returns metadata',
      async (extension, content, expectedPrintWidth) => {
        await withTempDir('oxfmt-config-explicit-ext-', async cwd => {
          const configPath = join(cwd, `custom.config${extension}`)
          await writeFile(configPath, content, 'utf8')

          const result = await loadOxfmtConfig({
            cwd,
            configPath,
            useCache: false,
            editorconfig: false,
          })

          expect(result.config.printWidth).toBe(expectedPrintWidth)
          expect(result.filepath).toBe(configPath)
          expect(result.dirname).toBe(cwd)
        })
      },
    )

    it('throws when explicit JS config has no default export', async () => {
      await withTempDir('oxfmt-config-explicit-js-no-default-', async cwd => {
        const configPath = join(cwd, 'custom.config.mjs')
        await writeFile(configPath, 'export const printWidth = 97\n', 'utf8')

        await expect(
          loadOxfmtConfig({
            cwd,
            configPath,
            useCache: false,
            editorconfig: false,
          }),
        ).rejects.toThrow(/Configuration file has no default export/u)
      })
    })

    it('throws when explicit JS config default export is not an object', async () => {
      await withTempDir('oxfmt-config-explicit-js-non-object-', async cwd => {
        const configPath = join(cwd, 'custom.config.mjs')
        await writeFile(configPath, 'export default ["printWidth"]\n', 'utf8')

        await expect(
          loadOxfmtConfig({
            cwd,
            configPath,
            useCache: false,
            editorconfig: false,
          }),
        ).rejects.toThrow(
          /Configuration file must have a default export that is an object/u,
        )
      })
    })

    it('loads explicit .json and .jsonc config path with custom filename', async () => {
      await withTempDir('oxfmt-config-explicit-json-', async cwd => {
        const jsonPath = join(cwd, 'custom.config.json')
        const jsoncPath = join(cwd, 'custom.config.jsonc')

        await writeFile(jsonPath, '{"printWidth":101}\n', 'utf8')
        await writeFile(
          jsoncPath,
          '{\n  // comment\n  "printWidth": 102\n}\n',
          'utf8',
        )

        const jsonResult = await loadOxfmtConfig({
          cwd,
          configPath: jsonPath,
          useCache: false,
          editorconfig: false,
        })
        const jsoncResult = await loadOxfmtConfig({
          cwd,
          configPath: jsoncPath,
          useCache: false,
          editorconfig: false,
        })

        expect(jsonResult.config.printWidth).toBe(101)
        expect(jsoncResult.config.printWidth).toBe(102)
      })
    })

    it('loads explicit JSONC config with trailing comma', async () => {
      await withTempDir(
        'oxfmt-config-explicit-jsonc-trailing-comma-',
        async cwd => {
          const configPath = join(cwd, 'custom.config.jsonc')
          await writeFile(
            configPath,
            '{\n  // comment\n  "printWidth": 110,\n}\n',
            'utf8',
          )

          const result = await loadOxfmtConfig({
            cwd,
            configPath,
            useCache: false,
            editorconfig: false,
          })

          expect(result.config).toStrictEqual({ printWidth: 110 })
        },
      )
    })

    it('loads explicit empty JSONC config as empty object', async () => {
      await withTempDir('oxfmt-config-explicit-jsonc-empty-', async cwd => {
        const configPath = join(cwd, 'custom.config.jsonc')
        await writeFile(configPath, '', 'utf8')

        const result = await loadOxfmtConfig({
          cwd,
          configPath,
          useCache: false,
          editorconfig: false,
        })

        expect(result.config).toStrictEqual({})
      })
    })

    it('throws for unsupported explicit config extension', async () => {
      await withTempDir('oxfmt-config-explicit-unsupported-', async cwd => {
        const configPath = join(cwd, 'custom.config.yaml')
        await writeFile(configPath, 'printWidth: 88\n', 'utf8')

        await expect(
          loadOxfmtConfig({
            cwd,
            configPath,
            useCache: false,
            editorconfig: false,
          }),
        ).rejects.toThrow(/Unsupported oxfmt config extension/u)
      })
    })

    it('throws for invalid explicit JSONC config', async () => {
      await withTempDir('oxfmt-config-explicit-jsonc-invalid-', async cwd => {
        const configPath = join(cwd, 'custom.config.jsonc')
        await writeFile(configPath, '{\n  "printWidth": 100,,\n}\n', 'utf8')

        await expect(
          loadOxfmtConfig({
            cwd,
            configPath,
            useCache: false,
            editorconfig: false,
          }),
        ).rejects.toThrow(/Failed to parse oxfmt configuration file/u)
      })
    })
  })
})
