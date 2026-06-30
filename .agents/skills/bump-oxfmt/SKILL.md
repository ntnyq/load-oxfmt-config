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
2. Review upstream changelog entries from current to target version.

- Primary source: `https://github.com/oxc-project/oxc/releases` (apps tags for oxfmt).
- Also review formatter changelog: `crates/oxc_formatter/CHANGELOG.md`.

3. Compare upstream implementation changes for touched behavior areas before coding.

- Check oxfmt/formatter source directories and confirm whether config schema, file detection, or ignore-related behavior changed.

4. Update `devDependencies.oxfmt` to the requested target while preserving semver range style.

- Default: keep caret range (`^x.y.z`) in `dependencies`/`devDependencies`.
- Only pin exact versions when the user explicitly asks for pinning.

5. Keep `peerDependencies.oxfmt` aligned with minimum supported version.
6. Install/update lockfile with `pnpm install` (or `pnpm up -D oxfmt@<target>`).
7. Run validation commands:
   - `pnpm run format:check`
   - `pnpm run lint`
   - `pnpm run typecheck`
   - `pnpm test`
   - `pnpm run build`
8. If behavior changed, update tests and docs that encode old oxfmt behavior.
9. Summarize results with changed files, test outcomes, changelog/source findings, and any follow-up risk.

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
pnpm up -D oxfmt@^<target>
pnpm run release:check
pnpm run build
```

If the user requested an exact version pin, use `pnpm up -D oxfmt@<target>` and keep that exact specifier.

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
- Changelog/source review: <key upstream changes and whether repository behavior is aligned>
- Notes: <breaking changes, if any>
```
