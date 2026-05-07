# AI Agent Customization for load-oxfmt-config

## Project Overview

**load-oxfmt-config** is a TypeScript library that loads and resolves oxfmt configuration files (JSON/JSONC/TS formats) and intelligently merges EditorConfig settings into the final configuration.

**Core responsibility**: Standardize configuration discovery across multiple formats with caching, EditorConfig fallback support, and auto-discovery walking the directory tree.

See [README.md](README.md) for features and usage examples.

## Essential Commands

```bash
pnpm build              # Bundle library with tsdown → dist/
pnpm test               # Run vitest suite (watches by default)
pnpm typecheck          # Type-check via tsgo
pnpm lint               # Run oxlint
pnpm format:check       # Audit formatting with oxfmt
pnpm release:check      # Full pre-release validation
```

## Architecture

### Module Breakdown

| Module                                         | Purpose                                     | Key Exports                                                           |
| ---------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| **[src/core.ts](src/core.ts)**                 | Main loader logic, caching, path resolution | `loadOxfmtConfig()`, `resolveOxfmtrcPath()`                           |
| **[src/editorconfig.ts](src/editorconfig.ts)** | EditorConfig integration, parsing, merging  | `resolveEditorconfigPath()`, `mergeRootOptions()`, `mergeOverrides()` |
| **[src/types.ts](src/types.ts)**               | Public TypeScript interfaces                | `Options`, `OxfmtOptions`, `OxfmtConfigOverride`                      |
| **[src/constants.ts](src/constants.ts)**       | Configuration filenames                     | `OXFMT_CONFIG_FILES`, `EDITORCONFIG_FILE`                             |

### Configuration Discovery Flow

```
loadOxfmtConfig(options)
  ├─ resolve path: explicit path or walk upward for known filenames
  ├─ read & parse (JSON/JSONC/TS via jiti)
  ├─ resolve editorconfig path
  ├─ merge editorconfig + overrides into oxfmt config
  └─ return merged OxfmtOptions
```

### Caching Strategy (Key Pattern)

The library uses **dual Promise-based caches**:

- **Resolve cache**: Maps `${cwd}::${configPath}` → resolved file path (prevents filesystem thrashing)
- **Config cache**: Maps `${resolvedPath}::${editorconfigPath}` → parsed config (key includes "missing:" prefix if editorconfig absent)

This prevents concurrent duplicate reads and automatically evicts on errors. Study [src/core.ts](src/core.ts) lines ~30-50 to understand the pattern.

## Development Conventions

### TypeScript

- **Config base**: `@ntnyq/tsconfig/strict.json` (strict mode enabled, ES2023 target)
- **Module type**: ESM only (`"type": "module"`, `"sideEffects": false`)
- **Conditional exports**: `"."` points to `.mjs` + `.d.mts`

### Testing

- **Framework**: Vitest 4.1.5
- **Structure**: `tests/fixtures/{load,resolve}/*` contains test scenarios as directory structures
- **Pattern**: Use `import.meta.dirname` for fixture path resolution; all tests are async/await
- Run new tests with `pnpm test`; vitest watches by default

### Error Handling

- **Graceful degradation**: Returns empty object `{}` when config is missing (not an error)
- **File I/O**: Uses `fs/promises` exclusively

### Code Style

- **Formatting**: Enforced by oxfmt (the tool this package configures!)
- **Linting**: oxlint
- **Pre-commit**: nano-staged hooks lint TypeScript files, format all

### Dependencies

- **Core**: `editorconfig`, `jiti` (TS config loading), `jsonc-parser`, `@ntnyq/utils`
- **Build**: `tsdown` (esbuild-powered bundler)
- **Peer**: oxfmt >=0.41.0 (required)

## Common Tasks for AI Agents

### Add Support for a New Config Format

1. Update `OXFMT_CONFIG_FILES` in [src/constants.ts](src/constants.ts)
2. Extend `readConfigFromFile()` in [src/core.ts](src/core.ts) with parsing logic
3. Add test fixture directory under `tests/fixtures/load/{format-name}/`
4. Run `pnpm test` to validate

### Extend EditorConfig Support

1. Add new field to `EditorconfigOption` type in [src/types.ts](src/types.ts)
2. Update `mergeRootOptions()` or `mergeOverrides()` in [src/editorconfig.ts](src/editorconfig.ts)
3. Add test fixture in `tests/fixtures/load/editor-{field-name}/`

### Debug a Failing Test

- Tests use directory-based fixtures; each fixture folder demonstrates a test case
- Examine `tests/index.test.ts` to see how fixtures map to assertions
- Use `pnpm test -- --reporter=verbose` for detailed output

## File References for Quick Lookup

- **Public API**: [src/index.ts](src/index.ts)
- **Type definitions**: [src/types.ts](src/types.ts)
- **Known config files**: [src/constants.ts](src/constants.ts)
- **Test examples**: [tests/fixtures/](tests/fixtures/)

## Build Output

- **ESM bundle**: `dist/index.mjs`
- **Type declarations**: `dist/index.d.mts`
- **Bundler**: tsdown (fast, esbuild-powered)

All files are pre-built before publishing. Run `pnpm build` after changes.

---

**Last updated**: 2025-05-07
