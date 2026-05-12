# load-oxfmt-config

[![CI](https://github.com/ntnyq/load-oxfmt-config/workflows/CI/badge.svg)](https://github.com/ntnyq/load-oxfmt-config/actions)
[![NPM VERSION](https://img.shields.io/npm/v/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![LICENSE](https://img.shields.io/github/license/ntnyq/load-oxfmt-config.svg)](https://github.com/ntnyq/load-oxfmt-config/blob/main/LICENSE)

> Load and resolve oxfmt configuration files, including explicit JS/TS config paths, and merge supported `.editorconfig` settings for [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html).

## Features

- 🔍 **Auto-discovery** - Automatically searches for config files in current and parent directories
- 📦 **Multiple formats** - Auto-discovers `.oxfmtrc.json`, `.oxfmtrc.jsonc`, and `oxfmt.config.ts`, and also supports explicit `.js` / `.mjs` / `.cjs` / `.mts` / `.cts` config paths
- 🧩 **EditorConfig fallback** - Merges supported `.editorconfig` fields into the returned oxfmt config result
- 🚫 **Ignore resolution** - Resolves ignore status with oxfmt CLI-like global + config-scoped semantics
- ⚡ **Built-in caching** - Caches both file resolution and parsed configs for optimal performance
- 🎯 **TypeScript support** - Fully typed with comprehensive type definitions
- 🛠️ **Flexible API** - Support explicit config paths or automatic discovery

## Install

```shell
npm install load-oxfmt-config
```

```shell
yarn add load-oxfmt-config
```

```shell
pnpm add load-oxfmt-config
```

> `oxfmt` is a peer dependency and should be installed alongside this package.

## Usage

### Basic Usage

Load config from current directory or parent directories:

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Automatically searches for oxfmt config files and the nearest .editorconfig
const result = await loadOxfmtConfig()
console.log(result.config) // { printWidth: 80, ... }
```

### Merge With `.editorconfig`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const result = await loadOxfmtConfig({ cwd: '/path/to/project' })

// Returns one merged static config object
console.log(result.config)
// {
//   tabWidth: 2,
//   printWidth: 100,
//   overrides: [
//     { files: ['src/**/*.ts'], options: { printWidth: 120 } }
//   ]
// }
```

### Specify Working Directory

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const result = await loadOxfmtConfig({
  cwd: '/path/to/project',
})
```

### Get Config Metadata

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const result = await loadOxfmtConfig({ cwd: '/path/to/project' })

console.log(result.config) // merged oxfmt options
console.log(result.filepath) // /path/to/project/.oxfmtrc.json (or undefined)
console.log(result.dirname) // /path/to/project (or undefined)
```

### Resolve Ignore Status

```ts
import { isOxfmtIgnored } from 'load-oxfmt-config'

const result = await isOxfmtIgnored({
  cwd: '/path/to/project',
  filepath: '/path/to/project/src/generated/foo.ts',
})

console.log(result)
// { ignored: true, reason: 'config-ignore-patterns' }
```

### Explicit Config Path

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Relative path (resolved relative to cwd)
const result = await loadOxfmtConfig({
  configPath: 'configs/.oxfmtrc.json',
  cwd: '/path/to/project',
})

// Absolute path
const absoluteResult = await loadOxfmtConfig({
  configPath: '/absolute/path/to/.oxfmtrc.json',
})
```

### Disable `.editorconfig`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Skip .editorconfig reading entirely
const result = await loadOxfmtConfig({
  editorconfig: false,
})
```

### Limit `.editorconfig` to `cwd`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Only look in the cwd directory itself, no upward traversal
const result = await loadOxfmtConfig({
  editorconfig: { onlyCwd: true },
})
```

### Override `.editorconfig` Search Directory

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Search .editorconfig from a custom directory instead of the config file's directory
const result = await loadOxfmtConfig({
  editorconfig: {
    cwd: '/path/to/editorconfig-dir',
  },
})
```

### Disable Caching

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Force reload from disk, bypassing cache
const result = await loadOxfmtConfig({
  useCache: false,
})
```

### Path Resolution Only

```ts
import { resolveOxfmtrcPath } from 'load-oxfmt-config'

// Only resolve the config file path without loading it
const configPath = await resolveOxfmtrcPath(process.cwd())
console.log(configPath) // '/path/to/.oxfmtrc.json' or undefined
```

## API

### `loadOxfmtConfig(options?)`

Load and parse oxfmt configuration files, merge supported `.editorconfig` fields, and return metadata for the resolved config file.

**Parameters:**

- `options` - Optional configuration object (`LoadOxfmtConfigOptions`)

Option fields:

#### `cwd`

- **Type:** `string`
- **Default:** `process.cwd()`

Current working directory to start searching for config files. The loader will walk up from this directory to find a config file.

#### `configPath`

- **Type:** `string`
- **Default:** `undefined`

Explicit path to the config file:

- **Relative path:** Resolved relative to `cwd`
- **Absolute path:** Used as-is
- **When provided:** Skips auto-discovery and uses this path directly

#### `useCache`

- **Type:** `boolean`
- **Default:** `true`

Enable in-memory caching for both path resolution and parsed config contents. When enabled:

- Config file paths are cached to avoid repeated filesystem lookups
- Parsed config objects are cached to avoid re-parsing
- Subsequent calls with the same parameters return cached results instantly

Set to `false` to force reload from disk on every call.

#### `editorconfig`

- **Type:** `boolean | EditorconfigOption`
- **Default:** `true`

Control how `.editorconfig` files are read and merged:

- **`true`** — Read and merge the nearest `.editorconfig`, walking up from the config file's directory (or `cwd` when no config path is given).
- **`false`** — Disable `.editorconfig` reading entirely.
- **`EditorconfigOption`** — Enable with additional settings:

| Property  | Type      | Default     | Description                                                                                                           |
| --------- | --------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `onlyCwd` | `boolean` | `false`     | When `true`, only look for `.editorconfig` in `cwd` itself — no upward traversal.                                     |
| `cwd`     | `string`  | `undefined` | Override the directory from which `.editorconfig` resolution starts, instead of the config file's directory or `cwd`. |

**Returns:** `Promise<LoadOxfmtConfigResult>`

- `config` - Parsed and merged oxfmt configuration object
- `filepath` - Resolved config absolute path (undefined when not found)
- `dirname` - Config directory (undefined when not found)

**Throws:** Error if config file exists but cannot be parsed.

### `resolveOxfmtrcPath(cwd, configPath?)`

Resolve the absolute path to oxfmt config file.

**Parameters:**

- `cwd` - Starting directory for resolution
- `configPath` - Optional explicit path (absolute or relative to cwd)

**Returns:** `Promise<string | undefined>` - Absolute path to config file, or `undefined` if not found.

### `isOxfmtIgnored(options)`

Resolve whether a file should be ignored with oxfmt CLI-like semantics.

**Parameters:**

- `options` - Required configuration object (`IsOxfmtIgnoredOptions`)

Option fields:

#### `cwd`

- **Type:** `string`
- **Default:** `process.cwd()`

Current working directory.
Also the base directory for default `.prettierignore` lookup.

#### `filepath`

- **Type:** `string`
- **Default:** required

File path to test.

#### `configPath`

- **Type:** `string`
- **Default:** `undefined`

Explicit oxfmt config path.
When provided, nested config lookup is disabled (same as oxfmt CLI `-c`).

#### `ignorePath`

- **Type:** `string | string[]`
- **Default:** `undefined`

Ignore files to use instead of default `.gitignore` hierarchy + cwd `.prettierignore`.
Can be passed multiple times in CLI style.

#### `withNodeModules`

- **Type:** `boolean`
- **Default:** `false`

Whether `node_modules` should be included.

#### `disableNestedConfig`

- **Type:** `boolean`
- **Default:** `false`

Disable nested config lookup.

#### `useCache`

- **Type:** `boolean`
- **Default:** `true`

Whether to use in-memory cache.

#### `includeConfigIgnorePatterns`

- **Type:** `boolean`
- **Default:** `true`

Whether to include ignore patterns defined in the resolved config file.

#### `loadConfigForIgnorePatterns`

- **Type:** `boolean`
- **Default:** `true`

Whether to load the resolved config file during ignore checks.
When `false`, `isOxfmtIgnored()` only applies global ignore and skips config loading.

**Returns:** `Promise<IsOxfmtIgnoredResult>`

- `ignored` - Whether the file is ignored
- `reason` - One of:
  - `default-dir`
  - `lockfile`
  - `gitignore`
  - `git-info-exclude`
  - `prettierignore`
  - `ignore-path`
  - `config-ignore-patterns`

## Config File Discovery

When `configPath` is not provided, the loader automatically searches for config files:

1. **Search order:** Starts from `cwd` and walks up to parent directories
2. **Supported filenames:**
   - `.oxfmtrc.json`
   - `.oxfmtrc.jsonc`
   - `oxfmt.config.ts`
3. **Stops when:**
   - A valid config file is found
   - Reaches the filesystem root
4. **EditorConfig:** The nearest `.editorconfig` is also resolved and merged into the returned result
5. **Returns:** Empty object `{}` if no config file is found

## Supported Config Formats

### JSON (`.oxfmtrc.json`)

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true
}
```

### JSONC (`.oxfmtrc.jsonc`)

JSON with comments support:

```jsonc
{
  // Formatting options
  "printWidth": 100,
  "tabWidth": 2,

  /* Code style preferences */
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
}
```

### TypeScript (`oxfmt.config.ts`)

```ts
export default {
  printWidth: 100,
  tabWidth: 2,
}
```

When `configPath` is passed explicitly, extensions `.json`, `.jsonc`, `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, and `.cjs` are supported. Extensionless paths are also accepted and parsed as JSON.

## `.editorconfig` Support

The loader reads the nearest `.editorconfig` file and maps the subset of fields that oxfmt supports:

- `end_of_line` → `endOfLine`
- `indent_style` → `useTabs`
- `indent_size` → `tabWidth` when `indent_style = space`
- `tab_width` → `tabWidth`
- `max_line_length` → `printWidth`
- `insert_final_newline` → `insertFinalNewline`
- `quote_type` → `singleQuote`

Only `[*]` is treated as a global section to match oxfmt. Other sections such as `[**]` and `[*.ts]` are converted into returned `overrides` entries.

## Ignore Strategy

`isOxfmtIgnored()` applies two layers:

1. Global ignore
2. Ignore patterns from the resolved oxfmt config (`ignorePatterns`)

Set `includeConfigIgnorePatterns: false` to skip config `ignorePatterns` matching.
Set `loadConfigForIgnorePatterns: false` to skip config loading entirely and keep only global ignore behavior.

Global ignore includes:

- Default ignored directories: `.git`, `.svn`, `.jj`, `node_modules`
- Default lockfiles: `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `bun.lockb`
- Ignore files:
  - If `ignorePath` is provided: use those files only (multiple supported)
  - If `ignorePath` is not provided:
    - Read `.gitignore` from the file's directory upward until the git repo boundary
    - Read `<repo>/.git/info/exclude` when inside a git repo
    - Read `.prettierignore` from `cwd`

Notes:

- `node_modules` can be included by passing `withNodeModules: true`.

- The default lockfile list mirrors oxfmt documentation intent (`package-lock.json`, `pnpm-lock.yaml`, etc.) and common ecosystem lockfiles. It is not guaranteed to be a complete internal oxfmt list.
- `ignorePatterns` are always interpreted relative to the resolved oxfmt config directory.
- `includeConfigIgnorePatterns` defaults to `true` to preserve current behavior.
- `loadConfigForIgnorePatterns` defaults to `true` to preserve current behavior.
- Nested config behavior follows oxfmt semantics:
  - default: nearest config from target file directory upward
  - `disableNestedConfig: true`: resolve from `cwd` only
  - `configPath`: also disables nested lookup (same intent as CLI `-c`)

## Precedence

The merged result follows this order:

1. Root-level values from the nearest `.editorconfig`
2. Root-level values from `.oxfmtrc.json`, `.oxfmtrc.jsonc`, or `oxfmt.config.ts`
3. Overrides generated from `.editorconfig` sections
4. Overrides declared directly in the oxfmt config file

This means explicit oxfmt config values always win over `.editorconfig` fallback values.

## Limitations

`loadOxfmtConfig()` returns a static merged `OxfmtOptions` shape. That means `.editorconfig` support is represented as merged root + overrides config data, not as per-file runtime evaluation. In practice this works well for common root settings and section-based overrides, but it is not a full replacement for oxfmt's own file-by-file config resolution.

## Error Handling

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

try {
  const result = await loadOxfmtConfig()
  console.log(result.config)
} catch (error) {
  // Thrown when a resolved config file cannot be parsed or loaded
  console.error('Failed to parse oxfmt config:', error.message)
}
```

## Caching Behavior

The caching system maintains two separate caches:

1. **Path Resolution Cache:** Stores resolved config file paths
2. **Config Content Cache:** Stores parsed configuration objects

**Cache keys are based on:**

- `cwd` + `configPath` for path resolution
- Resolved oxfmt path and resolved `.editorconfig` path for config content

**Cache invalidation:**

- Failed operations automatically clear their cache entries
- Use `useCache: false` to bypass cache for specific calls
- Cache persists for the lifetime of the Node.js process

## Related

- [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) - The Oxidation Compiler formatter
- [oxc](https://oxc.rs/) - The JavaScript Oxidation Compiler

## License

[MIT](./LICENSE) License © 2025-PRESENT [ntnyq](https://github.com/ntnyq)
