import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveOxfmtIgnore } from '../src'
import { withTempDir } from './helpers'

describe(resolveOxfmtIgnore, () => {
  it('ignores default node_modules directory and can opt in with withNodeModules', async () => {
    await withTempDir('oxfmt-ignore-default-', async cwd => {
      const filepath = join(cwd, 'node_modules', 'pkg', 'index.js')
      await mkdir(join(cwd, 'node_modules', 'pkg'), { recursive: true })
      await writeFile(filepath, 'export {}\n', 'utf8')

      const ignoredByDefault = await resolveOxfmtIgnore({ cwd, filepath })
      const included = await resolveOxfmtIgnore({
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

  it('ignores known lockfiles by default', async () => {
    await withTempDir('oxfmt-ignore-lock-', async cwd => {
      const filepath = join(cwd, 'pnpm-lock.yaml')
      await writeFile(filepath, 'lockfileVersion: 9\n', 'utf8')

      const result = await resolveOxfmtIgnore({ cwd, filepath })

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

      const byGitignore = await resolveOxfmtIgnore({
        cwd,
        filepath: gitignoredFile,
      })
      const byPrettierignore = await resolveOxfmtIgnore({
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

  it('resolves relative filepath against provided cwd', async () => {
    await withTempDir('oxfmt-ignore-relative-filepath-', async cwd => {
      const filepath = join(cwd, 'dist', 'a.js')
      await mkdir(join(cwd, 'dist'), { recursive: true })
      await writeFile(join(cwd, '.gitignore'), 'dist/**\n', 'utf8')
      await writeFile(filepath, 'console.log(1)\n', 'utf8')

      const result = await resolveOxfmtIgnore({
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

      await expect(resolveOxfmtIgnore({ cwd, filepath })).rejects.toThrow(
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

      const distResult = await resolveOxfmtIgnore({
        cwd,
        filepath: distFile,
        ignorePath: ['.customignore'],
      })
      const customResult = await resolveOxfmtIgnore({
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

      const result = await resolveOxfmtIgnore({ cwd, filepath })

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

      const nestedEnabled = await resolveOxfmtIgnore({ cwd, filepath })
      const nestedDisabled = await resolveOxfmtIgnore({
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

      const result = await resolveOxfmtIgnore({
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
})
