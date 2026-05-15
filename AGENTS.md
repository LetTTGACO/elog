# AGENTS.md

This file provides guidance to Claude Code / Codex-style coding agents when working in this repository.

## Project Overview

Elog is a CLI tool and library for syncing documents from writing and note-taking
platforms to blogging/CMS targets. The 1.0 rewrite is a pnpm/Turborepo monorepo
under the temporary development scope `@elogx-test/`.

The system is plugin-driven:

```text
download (from plugin) -> transform (middleware plugins) -> deploy (to plugins)
```

Supported plugin families in this repo:

- `playground/plugin-from-*`: download from Notion, Feishu Wiki/Space, FlowUs, Yuque Token/Pwd, Wolai
- `playground/plugin-image-*`: replace/rehost images via COS, OSS, GitHub, Qiniu, Upyun, local
- `playground/plugin-to-*`: deploy to Halo, WordPress, Confluence, local filesystem

## Common Commands

```bash
# Install dependencies
pnpm install

# Build all workspace packages through Turbo
pnpm build

# Build a single package from that package directory
cd packages/elog && pnpm build
cd playground/plugin-from-notion && pnpm build

# Manual integration smoke test
cd tests/test-elog && pnpm elog:sync
cd tests/test-elog && pnpm elog:sync-muti
```

There is no automated test framework configured. The `tests/test-elog` package is
a manual integration playground that invokes the built CLI and writes local docs,
images, and cache files.

## Monorepo Structure

| Directory | Purpose |
| --- | --- |
| `packages/elog/` | Core engine, CLI, config loading, plugin driver, shared types/context utilities |
| `playground/plugin-from-*` | Source/download plugins |
| `playground/plugin-image-*` | Transform plugins for image replacement/rehosting |
| `playground/plugin-to-*` | Target/deploy plugins |
| `tests/test-elog/` | Manual integration workspace and example configs |

Workspace membership is defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "playground/*"
  - "tests/*"
```

## Build System

- Root package manager: `pnpm@11.1.2`
- Root build command: `turbo build`
- Per-package build command: `tsdown`
- Turbo build outputs: `dist/**`
- Packages are ESM-only (`"type": "module"`)
- `tsdown.config.ts` currently enables sourcemaps and leaves extensions unfixed:

```ts
export default defineConfig({
  sourcemap: true,
  fixedExtension: false,
});
```

TypeScript settings are strict across packages (`strict`, `noImplicitOverride`,
`noUnusedLocals`, `moduleResolution: "Bundler"`, target `ES2022`).

## Runtime Entry Points

- CLI binary: `packages/elog/bin/elog.js`
- CLI setup: `packages/elog/src/cli.ts`
- Library entry: `packages/elog/src/index.ts`
- Programmatic runtime: `packages/elog/src/node-entry.ts`
- Main orchestrator: `packages/elog/src/Graph.ts`

The CLI exposes:

- `elog init`
- `elog sync`
  - `-c, --config <string>`: custom config file
  - `-e, --env <string>`: load dotenv file
  - `--debug`: set `process.env.DEBUG = 'true'`

`elog sync` loads env first, then loads config, then calls the library runtime.

## Configuration Loading

Config discovery lives in `packages/elog/src/utils/load.ts` and uses JoyCon plus
`bundle-require`.

Default searched filenames:

- `elog.config.ts`
- `elog.config.js`
- `elog.config.cjs`
- `elog.config.mjs`

The config shape is defined by `ElogConfig` in `packages/elog/src/types/common.ts`:

```ts
interface ElogConfig {
  disable?: boolean;
  disableCache?: boolean;
  cacheFilePath?: string;
  from: IPlugin;
  to: IPlugin | IPlugin[];
  plugins?: IPlugin[];
}
```

The exported helper `defineConfig()` is only a type/identity helper.

Important config behavior:

- A single workflow defaults `cacheFilePath` to `elog.cache.json`.
- Multiple workflows default to `elog.cache1.json`, `elog.cache2.json`, etc.
- Workflows with `disable: true` are filtered out in `node-entry.ts`.
- If every workflow is disabled, the runtime exits through `out.error()`.

## Core Architecture

### Graph

`Graph` in `packages/elog/src/Graph.ts` owns one workflow execution.

Construction:

1. Stores the resolved `ElogConfig`.
2. Initializes cache via `initCache()`.
3. Creates a `PluginDriver` with the workflow config and cached docs.

Sync flow:

```text
executeFromPluginHook('download')
executeChainHooks('transform')
updateCache()
executeVoidHooks('deploy')
writeCache()
```

Cache behavior:

- Cache is loaded from `path.join(process.cwd(), cacheFilePath)`.
- `disableCache` skips cache loading and forces a full sync.
- Written cache contains `cachedDocList` with `body: undefined` and the latest `sortedDocList`.
- `updateCache()` inserts docs with `DocStatus.NEW`; otherwise it updates by `_updateIndex`.

### PluginDriver

`PluginDriver` in `packages/elog/src/utils/PluginDriver.ts` normalizes plugin order:

```text
[from, ...plugins, ...to]
```

It supports three hook execution strategies:

- `executeFromPluginHook`: serial, expects exactly one matching plugin hook, used for `download`
- `executeChainHooks`: serial reducer, each `transform` receives the previous docs output
- `executeVoidHooks`: parallel `Promise.all`, ignores deploy hook return values

Each plugin instance gets its own `PluginContext` object created by
`getPluginContext(cacheDocList)`.

Current error behavior to be aware of: `runHook()` catches hook errors and returns
`new Error(error_)` instead of rethrowing. When changing hook execution, verify
whether callers expect fail-fast behavior or current best-effort behavior.

### PluginContext

`PluginContext` is injected as `this` for hook functions. It provides:

- `request`: HTTP helper from `utils/request`
- `cacheDocList`: docs loaded from cache for this workflow
- logging helpers: `debug`, `success`, `error`, `info`, `warn`
- `imgUtil`: image URL parsing, file-type detection, URL cleanup, buffer download, unique ID helpers

Use function syntax for hooks when accessing `this`; arrow functions will not bind
the plugin context.

## Document Download And Incremental Sync

Shared source-plugin helpers live in:

- `packages/elog/src/utils/context/FromContext.ts`
- `packages/elog/src/utils/doc/form.ts`

Most source plugins extend `ElogFromContext` and call `this.docDetailList()`.
That helper:

1. Calls the source API's `getSortedDocList()`.
2. Filters docs by `id` and `updateTime` against cached docs.
3. Retries cached docs previously marked `DOC_ERROR` or `IMAGE_ERROR`.
4. Downloads details through `tiny-async-pool` with `limit || 10`.
5. Returns `{ docDetailList, sortedDocList, docStatusMap }`.

If no documents need updating, the helper logs success and calls `process.exit()`.
Local deploy also exits when there are no docs to deploy.

## Image Transform Architecture

Shared image helpers live in:

- `packages/elog/src/utils/context/ImageContext.ts`
- `packages/elog/src/utils/doc/image.ts`
- `packages/elog/src/utils/image.ts`

Image plugins are `transform` middleware. Two styles exist:

- Cloud-style image plugins (`plugin-image-cos`, `oss`, `github`, `qiniu`, `upyun`) extend `ElogImageContext` and pass an `ImageUploader` with `hasImage()` and `uploadImage()`.
- `plugin-image-local` currently implements its own `ImageClient` directly using `PluginContext` and filesystem writes.

The shared replacement flow extracts image URLs from doc bodies, generates stable
file names, checks existing uploads, uploads missing images, and replaces original
URLs in `DocDetail.body`.

## Deploy Architecture

Deploy plugins implement `deploy(docs)`. Multiple `to` plugins are allowed and are
run in parallel by `executeVoidHooks('deploy')`.

Examples:

- `plugin-to-local` writes Markdown files with optional front matter and optional directory-structure deployment.
- `plugin-to-halo` and `plugin-to-confluence` wrap target-specific API and rendering/deployment classes.
- `plugin-to-wordpress` targets WordPress.

Because deploy hooks run in parallel, avoid relying on side effects from one target
plugin being visible to another target plugin.

## Plugin Development Pattern

Each plugin exports a default function that accepts config and returns `IPlugin`.
The npm package name is scoped (`@elogx-test/plugin-*`), but the internal
`IPlugin.name` values in current code are short names like `from-notion`,
`image-local`, and `to-local`.

Source plugin:

```ts
export default function notion(options: Partial<NotionConfig>): IPlugin {
  return {
    name: 'from-notion',
    async download(this) {
      const notion = new NotionClient(options as NotionConfig, this);
      return notion.getDocDetailList();
    },
  };
}
```

Transform plugin:

```ts
export default function imageLocal(options: Partial<ImageLocalConfig>): IPlugin {
  return {
    name: 'image-local',
    transform(docs) {
      const imageLocal = new ImageClient(options as ImageLocalConfig, this);
      return imageLocal.replaceImages(docs);
    },
  };
}
```

Deploy plugin:

```ts
export default function toLocal(options: Partial<LocalConfig>): IPlugin {
  return {
    name: 'to-local',
    deploy(docs) {
      const localDeploy = new LocalDeploy(options as LocalConfig, this);
      localDeploy.deploy(docs);
    },
  };
}
```

Plugin package conventions:

- Declare `@elogx-test/elog` as a peer dependency.
- Mark that peer optional via `peerDependenciesMeta`.
- Add `@elogx-test/elog: "workspace:*"` as a dev dependency.
- Keep plugin packages ESM-only.

## Publishing And CI

Publishing uses Changesets:

```bash
pnpm changeset
git add .changeset/ && git commit -m "chore: add changeset"
pnpm version
pnpm build && pnpm publish
git push --follow-tags
```

Changeset config:

- Base branch: `1.0-dev`
- Public access
- `test-elog` is ignored
- Internal dependency bumps default to patch

CI (`.github/workflows/ci.yml`) runs on pushes and PRs to `1.0-dev`:

```bash
pnpm install --frozen-lockfile
npx changeset status --since=origin/1.0-dev
pnpm turbo build --force
```

Every non-trivial PR to `1.0-dev` should include a changeset.

## Coding Conventions

- Use TypeScript strict mode.
- Use ESM imports/exports.
- Follow Prettier settings: 2-space indent, single quotes, trailing commas, 100 char print width.
- There is lint-staged formatting for `*.{ts,js,json,md}`.
- There is no repository ESLint config, even though `eslint` appears as a package dev dependency.
- Prefer existing context helpers (`ElogFromContext`, `ElogImageContext`, `ElogBaseContext`) over duplicating orchestration logic.
- Keep source plugins responsible for producing `DocDetail[]`; keep transform plugins responsible for mutating/returning docs; keep deploy plugins responsible for target side effects.
- Do not commit generated `dist/**`, `.turbo/**`, `.rush/**`, build logs, local docs/images, or cache files unless explicitly requested.

## Useful Files To Inspect

- `packages/elog/src/Graph.ts`: workflow orchestration and cache writes
- `packages/elog/src/utils/PluginDriver.ts`: plugin ordering and hook execution
- `packages/elog/src/utils/PluginContext.ts`: hook `this` context
- `packages/elog/src/utils/doc/form.ts`: incremental sync filtering and concurrent detail download
- `packages/elog/src/utils/doc/image.ts`: shared image replacement pipeline
- `packages/elog/src/utils/load.ts`: config resolution and cache path defaults
- `packages/elog/src/node-entry.ts`: multi-workflow handling
- `tests/test-elog/elog.config.ts`: manual integration example
