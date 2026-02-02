# load-oxfmt-config

[![CI](https://github.com/ntnyq/load-oxfmt-config/workflows/CI/badge.svg)](https://github.com/ntnyq/load-oxfmt-config/actions)
[![NPM VERSION](https://img.shields.io/npm/v/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![LICENSE](https://img.shields.io/github/license/ntnyq/load-oxfmt-config.svg)](https://github.com/ntnyq/load-oxfmt-config/blob/main/LICENSE)

> Load and resolve `.oxfmtrc.json(c)` configuration files for [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html).

## Features

- 🔍 **Auto-discovery** - Automatically searches for config files in current and parent directories
- 📦 **Multiple formats** - Supports both `.oxfmtrc.json` and `.oxfmtrc.jsonc` (JSON with comments)
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

// Automatically searches for .oxfmtrc.json(c) in current and parent directories
const config = await loadOxfmtConfig()
console.log(config) // { printWidth: 80, ... }
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

Load and parse oxfmt configuration file.

**Parameters:**

- `options` - Optional configuration object

**Returns:** `Promise<FormatOptions>` - Parsed oxfmt configuration object. Returns empty object `{}` if no config file is found.

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

## Config File Discovery

When `configPath` is not provided, the loader automatically searches for config files:

1. **Search order:** Starts from `cwd` and walks up to parent directories
2. **Supported filenames:**
   - `.oxfmtrc.json`
   - `.oxfmtrc.jsonc`
3. **Stops when:**
   - A valid config file is found
   - Reaches the filesystem root
4. **Returns:** Empty object `{}` if no config file is found

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
  "singleQuote": true
}
```

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
- Resolved file path for config content

**Cache invalidation:**

- Failed operations automatically clear their cache entries
- Use `useCache: false` to bypass cache for specific calls
- Cache persists for the lifetime of the Node.js process

## Related

- [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) - The Oxidation Compiler formatter
- [oxc](https://oxc.rs/) - The JavaScript Oxidation Compiler

## License

[MIT](./LICENSE) License © 2025-PRESENT [ntnyq](https://github.com/ntnyq)
