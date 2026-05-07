# AGENTS.md

Guidance for AI coding agents working in this repository.

## Scope and Goal

- Maintain a small ESM TypeScript library that loads oxfmt config, merges supported EditorConfig options, and resolves ignore status.
- Prefer minimal, focused changes that preserve current API behavior.

## First Commands to Run

- Install deps: `pnpm install`
- Run tests: `pnpm test`
- Run full quality gate: `pnpm run release:check`
- Build package: `pnpm run build`

## Project Layout

- `src/index.ts`: public export surface.
- `src/core.ts`: `loadOxfmtConfigResult()` implementation and cache orchestration.
- `src/config-file.ts`: config path resolution and walk-up lookup.
- `src/editorconfig.ts`: `.editorconfig` parsing and merge into formatter config.
- `src/ignore.ts`: ignore resolution (`.gitignore`, `.prettierignore`, config ignore patterns, defaults).
- `src/legacy.ts`: deprecated wrapper `loadOxfmtConfig()`.
- `tests/`: Vitest suites and fixtures.
- `tests/fixtures/`: canonical scenario fixtures.

## Coding Conventions

- Keep ESM style (`type: module`), no CommonJS conversion.
- Preserve async file-system flows and existing error propagation style.
- Preserve path normalization behavior before glob matching.
- Keep JSDoc examples and param/return docs on exported functions.
- Avoid broad refactors when fixing behavior; keep edits surgical.

## Testing Conventions

- Use fixture-driven tests for deterministic behavior.
- Use `withTempDir()` from `tests/helpers.ts` for dynamic filesystem scenarios.
- Prefer strict assertions (`toStrictEqual`) over snapshots.
- Add or update tests for behavior changes in:
  - config discovery (`resolveOxfmtrcPath`)
  - config loading/merging (`loadOxfmtConfigResult`)
  - ignore reasoning (`resolveOxfmtIgnore`, including `reason`)

## Known Behavior Guardrails

- Explicit `configPath` should bypass auto-discovery walk-up behavior.
- `resolveOxfmtIgnore` returns both `ignored` and a meaningful `reason` when ignored.
- Ignore semantics depend on pattern order, including negated patterns (`!`).
- Cache behavior should remain stable unless the change explicitly targets cache semantics.

## Reference Docs

- Primary API and usage examples: [README.md](README.md)
- Authoritative oxfmt config format: <https://oxc.rs/docs/guide/usage/formatter/config.html#oxfmtrc-json-c>
- Oxfmt formatter behavior: <https://oxc.rs/docs/guide/usage/formatter.html>
- EditorConfig spec: <https://editorconfig.org>
