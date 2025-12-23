# load-oxfmt-config

[![CI](https://github.com/ntnyq/load-oxfmt-config/workflows/CI/badge.svg)](https://github.com/ntnyq/load-oxfmt-config/actions)
[![NPM VERSION](https://img.shields.io/npm/v/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![NPM DOWNLOADS](https://img.shields.io/npm/dy/load-oxfmt-config.svg)](https://www.npmjs.com/package/load-oxfmt-config)
[![LICENSE](https://img.shields.io/github/license/ntnyq/load-oxfmt-config.svg)](https://github.com/ntnyq/load-oxfmt-config/blob/main/LICENSE)

Load .oxfmtrc.json(c) for oxfmt.

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

```ts
import { loadOxfmtConfig } from 'load-oxfmt-config'

const config = loadOxfmtConfig({
  cwd: '/configs',
})

console.log({ config })
```

## Options

- `configPath?: string` Path to the oxfmt config file, resolved relative to `cwd`.
- `cwd?: string` Current working directory used when searching for config files. Defaults to `process.cwd()`.
- `useCache?: boolean` Enable in-memory caching for path resolution and parsed config contents. Defaults to `true`.

## License

[MIT](./LICENSE) License © 2025-PRESENT [ntnyq](https://github.com/ntnyq)
