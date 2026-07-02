# AGENTS.md

This file provides guidance to Claude Code / Codex-style coding agents when working in this repository.

## Project Overview

Elog is a CLI tool and library for syncing documents from writing and note-taking
platforms to blogging/CMS targets. The 1.0 rewrite is a pnpm/Turborepo monorepo.
Release-line packages use the `@elog/` scope; experimental packages may remain
under `@elogx-test/` until they are promoted.

The system is plugin-driven:

```text
download (from plugin) -> transform (middleware plugins) -> deploy (to plugins)
```

Supported plugin families in this repo:

- `plugins/from/*`: download from Notion, Feishu Wiki/Space, FlowUs, Yuque Token/Pwd, Wolai
- `plugins/transform/*`: replace/rehost images via COS, OSS, GitHub, Qiniu, Upyun, local
- `plugins/to/*`: deploy to Halo, WordPress, Confluence, local filesystem

## Common Commands

```bash
# Install dependencies
pnpm install

# Build all workspace packages through Turbo
pnpm build

# Run automated tests through Turbo
pnpm test

# Run core package tests only
pnpm --filter @elog/cli test

# Build a single package from that package directory
cd packages/elog && pnpm build
cd plugins/from/notion && pnpm build

# Manual integration smoke test
cd tests/test-elog && pnpm elog:sync
cd tests/test-elog && pnpm elog:sync-muti
```

Vitest is configured for the core `packages/elog` package. The `tests/test-elog`
package remains a manual integration playground that invokes the built CLI and
writes local docs, images, and cache files.

## Monorepo Structure

| Directory | Purpose |
| --- | --- |
| `packages/elog/` | Core engine, CLI, config loading, plugin driver, shared types/context utilities |
| `plugins/from/*` | Source/download plugins |
| `plugins/transform/*` | Transform plugins for image replacement/rehosting |
| `plugins/to/*` | Target/deploy plugins |
| `tests/test-elog/` | Manual integration workspace and example configs |

Workspace membership is defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "plugins/from/*"
  - "plugins/transform/*"
  - "plugins/to/*"
  - "tests/*"
```

## Build System

- Root package manager: `pnpm@11.1.2`
- Root build command: `turbo build`
- Root test command: `turbo test`
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
- Runtime orchestrator: `packages/elog/src/runtime/Graph.ts`
- Multi-workflow runner: `packages/elog/src/runtime/WorkflowRunner.ts`

The CLI exposes:

- `elog init`
- `elog sync`
  - `-c, --config <string>`: custom config file
  - `-e, --env <string>`: load dotenv file
  - `--debug`: set `process.env.DEBUG = 'true'`

`elog sync` loads env first, loads raw config, resolves runtime workflows, then
calls the awaitable library runtime and prints structured workflow results.

## Configuration Loading

Raw config discovery lives in `packages/elog/src/config/load.ts` and uses JoyCon
plus `bundle-require`.

Default searched filenames:

- `elog.config.ts`
- `elog.config.js`
- `elog.config.cjs`
- `elog.config.mjs`

The current 1.0 config shape is defined by `ElogConfig` in
`packages/elog/src/types/common.ts`:

```ts
interface ElogConfig {
  id?: string;
  disable?: boolean;
  disableCache?: boolean;
  cacheFilePath?: string;
  from: FromPlugin;
  to: ToPlugin | ToPlugin[];
  plugins?: TransformPlugin[];
  deployStrategy?: 'serial' | 'parallel';
}
```

The exported helper `defineConfig()` is only a type/identity helper.

Config resolution behavior:

- A single workflow defaults `cacheFilePath` to `elog.cache.json`.
- Multiple workflows default to `elog.cache1.json`, `elog.cache2.json`, etc.
- Workflows with `disable: true` are preserved and skipped by `WorkflowRunner`.
- Malformed 1.0 plugin fields should be reported as diagnostics before runtime
  execution. For example, `plugins` must be an array of `TransformPlugin`
  entries; a single transform plugin object is a config error, not a thrown
  `TypeError`.
- Likely Elog 0.x public configs are detected at the adapter boundary and return
  diagnostics; full migration is intentionally not implemented yet.
- Validation diagnostics are reported before runtime execution.

## Core Architecture

Current sync architecture:

```text
Config load/resolve -> WorkflowRunner -> Graph -> PluginDriver -> CacheStore
```

### WorkflowRunner

`WorkflowRunner` in `packages/elog/src/runtime/WorkflowRunner.ts` owns
multi-workflow execution. It runs workflows serially, returns
`WorkflowResult[]`, skips disabled workflows, and stops on the first failed
workflow by default.

### Graph

`Graph` in `packages/elog/src/runtime/Graph.ts` owns one normalized workflow.

Sync flow:

```text
runDownloadHook()
runTransformPipeline()
cacheStore.update()
runDeployHooks()
cacheStore.write()
return WorkflowResult
```

`Graph.sync()` returns structured results:

- `success`: includes `workflowId`, synced count, cache path, and `sortedDocList`.
- `skipped`: currently used for disabled workflows and no-change workflows.
- `failed`: includes an `ElogError`; plugin failures are wrapped with plugin and hook metadata.

### CacheStore

`CacheStore` in `packages/elog/src/cache/CacheStore.ts` handles cache loading,
updating, and writing:

- `disableCache` skips cache loading and forces a full sync.
- Missing cache files load as an empty cache.
- `update()` inserts docs with `DocStatus.NEW`; otherwise it updates by `_updateIndex`.
- `write()` stores the latest `sortedDocList` and omits document `body` content.

### PluginDriver

`PluginDriver` in `packages/elog/src/runtime/PluginDriver.ts` is lifecycle-aware:

```text
from.download -> transforms in declaration order -> to.deploy
```

It exposes:

- `runDownloadHook()`: calls the single `from` plugin.
- `runTransformPipeline()`: serial reducer; each transform receives the previous output.
- `runDeployHooks()`: runs target deploy hooks with the configured `serial` or `parallel` strategy.

Hook errors are fail-fast and wrapped as `ElogPluginError`.

Runtime code must not call `process.exit()`. The CLI remains the process-exit
boundary: library/runtime failures should be returned as structured
`WorkflowResult` values and only translated into terminal output or exit codes by
commands such as `elog sync`.

### PluginContext

`PluginContext` is passed explicitly as the second hook parameter or first
download parameter. It groups runtime capabilities:

- `workflow`: workflow id and cache path.
- `logger`: `debug`, `success`, `error`, `info`, `warn`.
- `http`: HTTP helper from `utils/request`.
- `cache.docList`: docs loaded from cache for this workflow.
- `image`: image URL parsing, file-type detection, URL cleanup, buffer download, unique ID helpers.

`ctx.logger.error(message)` is plugin-fatal: it prints the error and throws,
allowing `PluginDriver` to wrap the failure as `ElogPluginError`. Plugin code
should not call `process.exit()` or import the CLI fatal logger directly.

Do not rely on hook `this` binding for new code.

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

If no documents need updating, the helper logs success and returns an empty
download result. Local deploy also returns without exiting when there are no docs
to deploy.

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

Deploy plugins implement `deploy(docs, ctx)`. Multiple `to` plugins are allowed.
Runtime configs default to serial deploy for debuggability; parallel deploy is an
explicit strategy.

Examples:

- `plugin-to-local` writes Markdown files with optional front matter and optional directory-structure deployment.
- `plugin-to-halo` and `plugin-to-confluence` wrap target-specific API and rendering/deployment classes.
- `plugin-to-wordpress` targets WordPress.

Because deploy hooks may run in parallel when configured, avoid relying on side
effects from one target plugin being visible to another target plugin.

## Plugin Development Pattern

Each plugin exports a default function that accepts config and returns a
discriminated plugin type. Release-line npm package names are scoped as
`@elog/plugin-*`, and the internal plugin names use namespace-style names such
as `from:notion`, `transform:image-local`, and `to:local`.

Source plugin:

```ts
export default function notion(options: Partial<NotionConfig>): FromPlugin {
  return {
    name: 'from:notion',
    kind: 'from',
    async download(ctx) {
      const notion = new NotionClient(options as NotionConfig, ctx);
      return notion.getDocDetailList();
    },
  };
}
```

Transform plugin:

```ts
export default function imageLocal(options: Partial<ImageLocalConfig>): TransformPlugin {
  return {
    name: 'transform:image-local',
    kind: 'transform',
    transform(docs, ctx) {
      const imageLocal = new ImageClient(options as ImageLocalConfig, ctx);
      return imageLocal.replaceImages(docs);
    },
  };
}
```

Deploy plugin:

```ts
export default function toLocal(options: Partial<LocalConfig>): ToPlugin {
  return {
    name: 'to:local',
    kind: 'to',
    deploy(docs, ctx) {
      const localDeploy = new LocalDeploy(options as LocalConfig, ctx);
      localDeploy.deploy(docs);
    },
  };
}
```

Plugin package conventions:

- Declare `@elog/cli` as a peer dependency.
- Mark that peer optional via `peerDependenciesMeta`.
- Add `@elog/cli: "workspace:*"` as a dev dependency.
- Use `@elog/plugin-*` for release-line packages.
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

- Base branch: `master`
- Public access
- `test-elog` is ignored
- Internal dependency bumps default to patch

CI (`.github/workflows/ci.yml`) runs on pushes and PRs to `master`:

```bash
pnpm install --frozen-lockfile
npx changeset status --since=origin/master
pnpm turbo build --force
```

Every non-trivial PR to `master` should include a changeset.

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

- `packages/elog/src/runtime/WorkflowRunner.ts`: multi-workflow execution
- `packages/elog/src/runtime/Graph.ts`: single workflow orchestration
- `packages/elog/src/runtime/PluginDriver.ts`: lifecycle hook execution
- `packages/elog/src/cache/CacheStore.ts`: cache load/update/write behavior
- `packages/elog/src/plugins/context.ts`: grouped plugin context factory
- `packages/elog/src/plugins/types.ts`: explicit plugin contract
- `packages/elog/src/config/resolve.ts`: adapter orchestration, defaults, validation
- `packages/elog/src/utils/doc/form.ts`: incremental sync filtering and concurrent detail download
- `packages/elog/src/utils/doc/image.ts`: shared image replacement pipeline
- `packages/elog/src/config/load.ts`: raw config file discovery and loading
- `packages/elog/src/node-entry.ts`: multi-workflow handling
- `tests/fixtures/basic-config/elog.config.ts`: automated fixture smoke config
- `tests/test-elog/elog.config.ts`: manual integration example
