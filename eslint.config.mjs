// @ts-check

import { defineESLintConfig } from '@ntnyq/eslint-config'

export default defineESLintConfig({
  perfectionist: {
    all: true,
  },
  typescript: {
    overrides: {
      '@typescript-eslint/consistent-generic-constructors': 'off',
    },
  },
})
