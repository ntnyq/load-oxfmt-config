import { describe, expectTypeOf, it } from 'vitest'
import type { LoadOxfmtConfigOptions, Options } from '../src'

describe('public types', () => {
  it('keeps deprecated Options alias compatible with LoadOxfmtConfigOptions', () => {
    expectTypeOf<Options>().toEqualTypeOf<LoadOxfmtConfigOptions>()
  })
})
