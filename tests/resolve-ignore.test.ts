import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isOxfmtIgnored } from '../src'
import { withTempDir } from './helpers'

describe(isOxfmtIgnored, () => {
  it('ignores default node_modules directory and can opt in with option withNodeModules', async () => {
    await withTempDir('oxfmt-ignore-default-', async cwd => {
      const filepath = join(cwd, 'node_modules', 'pkg', 'index.js')
      await mkdir(join(cwd, 'node_modules', 'pkg'), { recursive: true })
      await writeFile(filepath, 'export {}\n', 'utf8')

      const ignoredByDefault = await isOxfmtIgnored({ cwd, filepath })
      const included = await isOxfmtIgnored({
        cwd,
        filepath,
        withNodeModules: true,
      })

      expect(ignoredByDefault).toStrictEqual({
        ignored: true,
        reason: 'default-dir',
      })
      expect(included).toStrictEqual({ ignored: false })
    })
  })

  it('does not treat a filename that matches an ignored directory name as ignored', async () => {
    await withTempDir('oxfmt-ignore-filename-collision-', async cwd => {
      const filepath = join(cwd, 'src', 'node_modules')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({ ignored: false })
    })
  })

  it('ignores known lockfiles by default', async () => {
    await withTempDir('oxfmt-ignore-lock-', async cwd => {
      const filepath = join(cwd, 'pnpm-lock.yaml')
      await writeFile(filepath, 'lockfileVersion: 9\n', 'utf8')

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({ ignored: true, reason: 'lockfile' })
    })
  })

  it('uses cwd .gitignore/.prettierignore when ignorePath is not provided', async () => {
    await withTempDir('oxfmt-ignore-default-files-', async cwd => {
      const gitignoredFile = join(cwd, 'dist', 'a.js')
      const prettierIgnoredFile = join(cwd, 'snapshots', 'a.snap')
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await mkdir(join(cwd, 'snapshots'), { recursive: true })
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(join(cwd, '.prettierignore'), '*.snap\n', 'utf8')
      await writeFile(gitignoredFile, 'console.log(1)\n', 'utf8')
      await writeFile(prettierIgnoredFile, 'snapshot\n', 'utf8')

      const byGitignore = await isOxfmtIgnored({
        cwd,
        filepath: gitignoredFile,
      })
      const byPrettierignore = await isOxfmtIgnored({
        cwd,
        filepath: prettierIgnoredFile,
      })

      expect(byGitignore).toStrictEqual({ ignored: true, reason: 'gitignore' })
      expect(byPrettierignore).toStrictEqual({
        ignored: true,
        reason: 'prettierignore',
      })
    })
  })

  it('ignores editorconfig read errors when resolving ignore status', async () => {
    await withTempDir('oxfmt-ignore-editorconfig-irrelevant-', async cwd => {
      const filepath = join(cwd, 'src', 'a.ts')
      const editorconfigPath = join(cwd, '.editorconfig')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(join(cwd, '.oxfmtrc.json'), '{}\n', 'utf8')
      await writeFile(editorconfigPath, '[*]\nindent_size = 2\n', 'utf8')
      await chmod(editorconfigPath, 0o000)

      try {
        await expect(isOxfmtIgnored({ cwd, filepath })).resolves.toStrictEqual({
          ignored: false,
        })
      } finally {
        await chmod(editorconfigPath, 0o644)
      }
    })
  })

  it('does not throw when filepath is outside ignore file directory scope', async () => {
    await withTempDir('oxfmt-ignore-parent-path-', async cwd => {
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      const filepath = resolve(cwd, '..', 'outside.ts')

      await expect(isOxfmtIgnored({ cwd, filepath })).resolves.toStrictEqual({
        ignored: false,
      })
    })
  })

  it('resolves relative filepath against provided cwd', async () => {
    await withTempDir('oxfmt-ignore-relative-filepath-', async cwd => {
      const filepath = join(cwd, 'dist', 'a.js')
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(filepath, 'console.log(1)\n', 'utf8')

      const result = await isOxfmtIgnored({
        cwd,
        filepath: 'dist/a.js',
      })

      expect(result).toStrictEqual({ ignored: true, reason: 'gitignore' })
    })
  })

  it('throws for non-missing ignore file read errors', async () => {
    await withTempDir('oxfmt-ignore-read-error-', async cwd => {
      const filepath = join(cwd, 'src', 'a.ts')
      await mkdir(join(cwd, '.gitignore'), { recursive: true })
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')

      await expect(isOxfmtIgnored({ cwd, filepath })).rejects.toThrow(
        /EISDIR|directory/u,
      )
    })
  })

  it('uses explicit ignorePath files instead of cwd .gitignore/.prettierignore', async () => {
    await withTempDir('oxfmt-ignore-explicit-', async cwd => {
      const distFile = join(cwd, 'dist', 'a.js')
      const customFile = join(cwd, 'custom', 'a.js')
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await mkdir(join(cwd, 'custom'), { recursive: true })
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(join(cwd, '.customignore'), 'custom/**\n', 'utf8')
      await writeFile(distFile, 'console.log(1)\n', 'utf8')
      await writeFile(customFile, 'console.log(1)\n', 'utf8')

      const distResult = await isOxfmtIgnored({
        cwd,
        filepath: distFile,
        ignorePath: ['.customignore'],
      })
      const customResult = await isOxfmtIgnored({
        cwd,
        filepath: customFile,
        ignorePath: ['.customignore'],
      })

      expect(distResult).toStrictEqual({ ignored: false })
      expect(customResult).toStrictEqual({
        ignored: true,
        reason: 'ignore-path',
      })
    })
  })

  it('applies config ignorePatterns from nearest config by default', async () => {
    await withTempDir('oxfmt-ignore-nested-', async cwd => {
      const nestedDir = join(cwd, 'packages', 'app')
      const filepath = join(nestedDir, 'local', 'a.ts')
      await mkdir(join(nestedDir, 'local'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['packages/**'] }),
        'utf8',
      )
      await writeFile(
        join(nestedDir, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['local/**'] }),
        'utf8',
      )

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })

  it('uses cwd-based config lookup when disableNestedConfig is true', async () => {
    await withTempDir('oxfmt-ignore-disable-nested-', async cwd => {
      const nestedDir = join(cwd, 'packages', 'app')
      const filepath = join(nestedDir, 'local', 'a.ts')
      await mkdir(join(nestedDir, 'local'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['packages/app/local/**'] }),
        'utf8',
      )
      await writeFile(
        join(nestedDir, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: [] }),
        'utf8',
      )

      const nestedEnabled = await isOxfmtIgnored({ cwd, filepath })
      const nestedDisabled = await isOxfmtIgnored({
        cwd,
        filepath,
        disableNestedConfig: true,
      })

      expect(nestedEnabled).toStrictEqual({ ignored: false })
      expect(nestedDisabled).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })

  it('disables nested lookup when explicit configPath is provided', async () => {
    await withTempDir('oxfmt-ignore-explicit-config-', async cwd => {
      const nestedDir = join(cwd, 'packages', 'app')
      const filepath = join(nestedDir, 'local', 'a.ts')
      const configPath = join(cwd, '.oxfmtrc.json')
      await mkdir(join(nestedDir, 'local'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')
      await writeFile(
        configPath,
        JSON.stringify({ ignorePatterns: ['packages/app/local/**'] }),
        'utf8',
      )
      await writeFile(
        join(nestedDir, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: [] }),
        'utf8',
      )

      const result = await isOxfmtIgnored({
        cwd,
        filepath,
        configPath,
      })

      expect(result).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })

  it('supports negated config ignorePatterns', async () => {
    await withTempDir('oxfmt-ignore-negated-pattern-', async cwd => {
      const filepath = join(cwd, 'src', 'keep.ts')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const keep = 1\n', 'utf8')
      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['src/**', '!src/keep.ts'] }),
        'utf8',
      )

      const result = await isOxfmtIgnored({ cwd, filepath })

      expect(result).toStrictEqual({ ignored: false })
    })
  })

  it('applies config ignorePatterns in order with last match taking precedence', async () => {
    await withTempDir('oxfmt-ignore-pattern-order-', async cwd => {
      const filepath = join(cwd, 'src', 'a.ts')
      await mkdir(join(cwd, 'src'), { recursive: true })
      await writeFile(filepath, 'export const a = 1\n', 'utf8')

      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['src/**', '!src/**'] }),
        'utf8',
      )
      const unignored = await isOxfmtIgnored({ cwd, filepath })

      await writeFile(
        join(cwd, '.oxfmtrc.json'),
        JSON.stringify({ ignorePatterns: ['!src/**', 'src/**'] }),
        'utf8',
      )
      const ignored = await isOxfmtIgnored({
        cwd,
        filepath,
        useCache: false,
      })

      expect(unignored).toStrictEqual({ ignored: false })
      expect(ignored).toStrictEqual({
        ignored: true,
        reason: 'config-ignore-patterns',
      })
    })
  })
})
