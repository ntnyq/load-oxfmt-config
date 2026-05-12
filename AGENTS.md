# AGENTS.md

Guidance for AI coding agents working in this repository.

## Scope

- Maintain a small ESM TypeScript library that:
  - Loads oxfmt config with metadata via `loadOxfmtConfig()`.
  - Merges supported `.editorconfig` fields.
  - Resolves ignore status via `isOxfmtIgnored()`.
- Prefer focused changes that preserve public behavior unless the task explicitly requests a breaking change.

## First Commands To Run

- Install deps: `pnpm install`
- Run tests: `pnpm test`
- Run targeted ignore tests: `pnpm vitest run tests/resolve-ignore.test.ts`
- Run quality gate: `pnpm run release:check`
- Build package: `pnpm run build`

## Project Layout

- `src/index.ts`: public export surface.
- `src/core.ts`: `loadOxfmtConfig()` and cache orchestration.
- `src/config-file.ts`: config path resolution and file parsing.
- `src/editorconfig.ts`: `.editorconfig` lookup + mapping + merge.
- `src/ignore.ts`: `isOxfmtIgnored()` and ignore reasoning.
- `src/legacy.ts`: deprecated `loadOxfmtConfig()` wrapper.
- `src/types.ts`: public option/result interfaces.
- `tests/`: Vitest suites.
- `tests/fixtures/`: fixture-driven scenarios.

## Code Conventions

- Keep ESM style (`type: module`); do not convert to CommonJS.
- Preserve async fs flows and current error-propagation behavior.
- Preserve path normalization before glob matching.
- Keep JSDoc on exported APIs and examples aligned with current API names.
- Avoid broad refactors; apply surgical edits.

## Testing Conventions

- Prefer fixture-driven tests for deterministic behavior.
- Use `withTempDir()` from `tests/helpers.ts` for dynamic filesystem scenarios.
- Prefer strict assertions (`toStrictEqual`) over snapshots.
- Add/adjust tests when changing:
  - config discovery (`resolveOxfmtrcPath`)
  - config loading/merging (`loadOxfmtConfig`)
  - ignore reasoning (`isOxfmtIgnored`, including `reason`)

## Behavior Guardrails

- Explicit `configPath` disables nested config lookup behavior.
- `isOxfmtIgnored()` must keep stable reason semantics:
  - `default-dir`, `lockfile`, `gitignore`, `prettierignore`, `ignore-path`, `config-ignore-patterns`
- `ignorePath` input supports `string | string[]`; normalize internally to an array without behavior changes.
- `ignorePatterns` matching must preserve pattern order and negation (`!`) semantics.
- Cache behavior should stay stable unless a task explicitly targets cache semantics.

## References

- API and behavior docs: [README.md](README.md)
- Oxfmt config format: <https://oxc.rs/docs/guide/usage/formatter/config.html#oxfmtrc-json-c>
- Oxfmt formatter overview: <https://oxc.rs/docs/guide/usage/formatter.html>
- EditorConfig spec: <https://editorconfig.org>
