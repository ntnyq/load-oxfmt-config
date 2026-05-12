import { describe, expectTypeOf, it } from 'vitest'
import type { IsOxfmtIgnoredResult, LoadOxfmtConfigOptions } from '../src'

describe('public types', () => {
  it('exposes load option types', () => {
    expectTypeOf<LoadOxfmtConfigOptions>().toBeObject()
  })

  it('includes git-info-exclude in ignore reason union', () => {
    expectTypeOf<IsOxfmtIgnoredResult['reason']>().toExtend<
      | 'default-dir'
      | 'lockfile'
      | 'gitignore'
      | 'git-info-exclude'
      | 'prettierignore'
      | 'ignore-path'
      | 'config-ignore-patterns'
      | undefined
    >()
  })
})
