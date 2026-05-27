---
name: bump-oxfmt
description: Bump oxfmt version safely in this repository. Use when the user asks to upgrade oxfmt, align peer dependency floor, verify formatter compatibility, or prepare an oxfmt-related maintenance PR/release.
---

# bump-oxfmt

Core rule: treat an oxfmt bump as a behavior change until proven otherwise. Always run the repository quality gate before finishing.

## Inputs To Confirm

- Target oxfmt version or range (example: `0.52.0` or `^0.52.0`)
- Whether peer dependency floor should move with the dev dependency
- Whether lockfile updates are expected in this change

If the user does not specify a target, choose the latest stable `oxfmt` and state that explicitly.

## Repository Facts

- Package manager: `pnpm`
- Quality gate: `pnpm run release:check`
- Targeted ignore tests: `pnpm vitest run tests/resolve-ignore.test.ts`
- Build check: `pnpm run build`

## Workflow Checklist

1. Inspect current versions in `package.json`.
2. Update `devDependencies.oxfmt` to the requested target.
3. Keep `peerDependencies.oxfmt` aligned with minimum supported version.
4. Install/update lockfile with `pnpm install` (or `pnpm up -D oxfmt@<target>`).
5. Run validation commands:
   - `pnpm run format:check`
   - `pnpm run lint`
   - `pnpm run typecheck`
   - `pnpm test`
   - `pnpm run build`
6. If behavior changed, update tests and docs that encode old oxfmt behavior.
7. Summarize results with changed files, test outcomes, and any follow-up risk.

## Compatibility Checks

- Ensure public API types still compile, especially `FormatConfig` usage in `src/types.ts` and `src/editorconfig.ts`.
- Verify ignore reasoning semantics remain stable in `isOxfmtIgnored()`:
  - `default-dir`
  - `lockfile`
  - `gitignore`
  - `prettierignore`
  - `ignore-path`
  - `config-ignore-patterns`
- Re-run fixture-driven suites if parser/format behavior changed.

## Change Boundaries

- Do not introduce broad refactors while bumping oxfmt.
- Preserve ESM TypeScript style and existing async fs error behavior.
- Avoid unrelated dependency upgrades unless the user asks.

## Suggested Command Sequence

```bash
pnpm up -D oxfmt@<target>
pnpm run release:check
pnpm run build
```

If any check fails, fix only the breakages directly caused by the version bump.

## Output Template

Use this structure when reporting completion:

```md
## oxfmt bump summary

- Target: <version>
- Updated files: <list>
- Validation:
  - format:check: <pass/fail>
  - lint: <pass/fail>
  - typecheck: <pass/fail>
  - test: <pass/fail>
  - build: <pass/fail>
- Notes: <breaking changes, if any>
```
