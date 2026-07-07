# Repository Guidelines

## Project Structure & Module Organization

This repository is a small ESM TypeScript library for loading and resolving
oxfmt configuration. The public entry point is `src/index.ts`, which re-exports
the core APIs. Core behavior lives in `src/core.ts`, config file discovery and
parsing in `src/config.ts`, `.editorconfig` handling in
`src/editorconfig.ts`, ignore resolution in `src/ignore.ts`, shared constants in
`src/constants.ts`, and public types in `src/types.ts`. Tests are in `tests/`,
with deterministic filesystem fixtures under `tests/fixtures/`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies using the pinned package manager.
- `pnpm run build`: build the package with tsdown and emit declarations.
- `pnpm run dev`: run tsdown in watch mode while developing.
- `pnpm test`: run the Vitest suite, including configured typecheck tests.
- `pnpm run typecheck`: run `tsgo --noEmit`.
- `pnpm run format` / `pnpm run format:check`: format or check with oxfmt.
- `pnpm run lint`: run oxlint.
- `pnpm run release:check`: run format check, lint, typecheck, and tests.

## Coding Style & Naming Conventions

Use TypeScript ESM syntax and keep imports extensionless, matching existing
files. Follow the current oxfmt style: 2-space indentation, single quotes,
minimal semicolons, and trailing commas where the formatter adds them. Prefer
clear camelCase names for functions, variables, and options. Keep public API
types in `src/types.ts`, and keep exported API names aligned with README
examples.

## Testing Guidelines

Vitest is the test framework. Add tests beside related suites in `tests/`, using
descriptive names such as `resolve-ignore.test.ts` or `load-config.test.ts`.
Prefer fixture-driven tests for config discovery and use `withTempDir()` from
`tests/helpers.ts` for dynamic filesystem cases. Use strict assertions such as
`toStrictEqual` for object results, and cover behavior changes to
`loadOxfmtConfig`, `resolveOxfmtrcPath`, and `isOxfmtIgnored`.

## Commit & Pull Request Guidelines

Git history uses Conventional Commit prefixes, especially `feat:`, `fix:`, and
`chore:`. Keep commits focused and imperative, for example
`fix: preserve ignore pattern order`. Pull requests should describe the behavior
change, link related issues when applicable, and note test coverage or skipped
checks. Include screenshots only for documentation or rendered-output changes.

## Agent-Specific Instructions

Follow the repository’s local instruction to prefix shell commands with `rtk`,
except `pnpm typecheck`. Avoid broad refactors unless requested, preserve public
behavior by default, and update tests when changing config loading, cache,
editorconfig, or ignore semantics.
