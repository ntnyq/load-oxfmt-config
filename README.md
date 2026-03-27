# load-oxfmt-config

[![CI](https://github.com/ntnyq/load-oxfmt-config/workflows/CI/badge.svg)](https://github.com/ntnyq/load-oxfmt-config/actions)
[![NPM VERSION](https://img.shields.io/npm/v/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![LICENSE](https://img.shields.io/github/license/ntnyq/load-oxfmt-config.svg)](https://github.com/ntnyq/load-oxfmt-config/blob/main/LICENSE)

> Load and resolve oxfmt configuration files and merge supported `.editorconfig` settings for [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html).

## Features

- 🔍 **Auto-discovery** - Automatically searches for config files in current and parent directories
- 📦 **Multiple formats** - Supports `.oxfmtrc.json`, `.oxfmtrc.jsonc`, and `oxfmt.config.ts`
- 🧩 **EditorConfig fallback** - Merges supported `.editorconfig` fields into the returned oxfmt config result
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

## Usage

### Basic Usage

Load config from current directory or parent directories:

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Automatically searches for oxfmt config files and the nearest .editorconfig
const config = await loadOxfmtConfig()
console.log(config) // { printWidth: 80, ... }
```

### Merge With `.editorconfig`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const config = await loadOxfmtConfig({ cwd: '/path/to/project' })

// Returns one merged static config object
console.log(config)
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
import { loadOxfmtConfig } from 'load-oxfmtConfig'

const config = await loadOxfmtConfig({
  cwd: '/path/to/project',
})
```

### Explicit Config Path

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Relative path (resolved relative to cwd)
const config = await loadOxfmtConfig({
  configPath: 'configs/.oxfmtrc.json',
  cwd: '/path/to/project',
})

// Absolute path
const config = await loadOxfmtConfig({
  configPath: '/absolute/path/to/.oxfmtrc.json',
})
```

### Disable `.editorconfig`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Skip .editorconfig reading entirely
const config = await loadOxfmtConfig({
  editorconfig: false,
})
```

### Limit `.editorconfig` to `cwd`

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Only look in the cwd directory itself, no upward traversal
const config = await loadOxfmtConfig({
  editorconfig: { onlyCwd: true },
})
```

### Disable Caching

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

// Force reload from disk, bypassing cache
const config = await loadOxfmtConfig({
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

Load and parse oxfmt configuration files, then merge supported `.editorconfig` fields into the returned result.

**Parameters:**

- `options` - Optional configuration object

**Returns:** `Promise<FormatOptions>` - Parsed and merged oxfmt configuration object. Returns empty object `{}` if no supported config file is found.

**Throws:** Error if config file exists but cannot be parsed.

### `resolveOxfmtrcPath(cwd, configPath?)`

Resolve the absolute path to oxfmt config file.

**Parameters:**

- `cwd` - Starting directory for resolution
- `configPath` - Optional explicit path (absolute or relative to cwd)

**Returns:** `Promise<string | undefined>` - Absolute path to config file, or `undefined` if not found.

## Options

All options are optional.

### `cwd`

- **Type:** `string`
- **Default:** `process.cwd()`

Current working directory to start searching for config files. The loader will walk up from this directory to find a config file.

### `configPath`

- **Type:** `string`
- **Default:** `undefined`

Explicit path to the config file:

- **Relative path:** Resolved relative to `cwd`
- **Absolute path:** Used as-is
- **When provided:** Skips auto-discovery and uses this path directly

### `useCache`

- **Type:** `boolean`
- **Default:** `true`

Enable in-memory caching for both path resolution and parsed config contents. When enabled:

- Config file paths are cached to avoid repeated filesystem lookups
- Parsed config objects are cached to avoid re-parsing
- Subsequent calls with the same parameters return cached results instantly

Set to `false` to force reload from disk on every call.

### `editorconfig`

- **Type:** `boolean | EditorconfigOption`
- **Default:** `true`

Control how `.editorconfig` files are read and merged:

- **`true`** — Read and merge the nearest `.editorconfig`, walking up from the config file's directory (or `cwd` when no config path is given).
- **`false`** — Disable `.editorconfig` reading entirely.
- **`EditorconfigOption`** — Enable with additional settings:

| Property  | Type      | Default | Description                                                                       |
| --------- | --------- | ------- | --------------------------------------------------------------------------------- |
| `onlyCwd` | `boolean` | `false` | When `true`, only look for `.editorconfig` in `cwd` itself — no upward traversal. |

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

## `.editorconfig` Support

The loader reads the nearest `.editorconfig` file and maps the subset of fields that oxfmt supports:

- `end_of_line` → `endOfLine`
- `indent_style` → `useTabs`
- `indent_size` / `tab_width` → `tabWidth`
- `max_line_length` → `printWidth`
- `insert_final_newline` → `insertFinalNewline`

Glob sections such as `[*.ts]` are converted into returned `overrides` entries.

## Precedence

The merged result follows this order:

1. Root-level values from the nearest `.editorconfig`
2. Root-level values from `.oxfmtrc.json`, `.oxfmtrc.jsonc`, or `oxfmt.config.ts`
3. Overrides generated from `.editorconfig` sections
4. Overrides declared directly in the oxfmt config file

This means explicit oxfmt config values always win over `.editorconfig` fallback values.

## Limitations

`loadOxfmtConfig()` returns a static `OxfmtOptions` object. That means `.editorconfig` support is represented as a merged config shape, not as per-file runtime evaluation. In practice this works well for common root settings and section-based overrides, but it is not a full replacement for oxfmt's own file-by-file config resolution.

## Error Handling

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

try {
  const config = await loadOxfmtConfig()
} catch (error) {
  // Thrown when config file exists but contains invalid JSON
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
