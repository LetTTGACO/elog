# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Elog is a CLI tool and library for syncing documents from writing/note-taking platforms (Notion, Feishu, Yuque, FlowUs, Wolai) to blogging/CMS platforms (Halo, WordPress, Confluence, local filesystem), with optional image rehosting (COS, OSS, GitHub, Qiniu, Upyun, local). This is a **1.0 rewrite**. NPM scope during development is `@elogx-test/`.

## Build Commands

```bash
# Install dependencies
pnpm install

# Build all packages (Turborepo, respects dependency order)
pnpm build

# Build single package (run from within the package directory)
cd packages/elog && pnpm build
cd playground/plugin-from-notion && pnpm build
```

Build tool per package: **tsup** (esbuild-based). Output: ESM-only with `.d.ts` and sourcemaps.

## Monorepo Structure

| Directory | Purpose |
|-----------|---------|
| `packages/elog/` | Core engine — Graph orchestrator, PluginDriver, CLI, types |
| `playground/plugin-from-*` | Download plugins (Notion, Feishu Wiki/Space, FlowUs, Yuque Token/Pwd, Wolai) |
| `playground/plugin-image-*` | Image rehosting plugins (COS, OSS, GitHub, Qiniu, Upyun, local) |
| `playground/plugin-to-*` | Deploy plugins (Halo, WordPress, Confluence, local) |
| `tests/test-elog/` | Integration test (manual CLI invocation, no automated test framework) |

## Architecture: Plugin-Driven Pipeline

The core is a three-phase sync pipeline orchestrated by `Graph` (`packages/elog/src/Graph.ts`):

```
download (from plugin) → transform (chain hooks) → deploy (to plugin(s))
```

### Key Classes

- **`Graph`** — Top-level orchestrator. Initializes cache, creates `PluginDriver`, runs `sync()`.
- **`PluginDriver`** (`src/utils/PluginDriver.ts`) — Manages plugin lifecycle with three hook execution strategies:
  - `executeFromPluginHook` — async serial, single handler (exactly one "from" plugin for `download`)
  - `executeChainHooks` — async serial chain, each receives previous output (`transform` hooks)
  - `executeVoidHooks` — async parallel, ignores return values (`deploy` hooks)
- **`IPlugin`** (`src/types/plugin.ts`) — Plugin interface with optional `download`, `transform`, `deploy` hooks. Identified by `name`.
- **`PluginContext`** — Injected into hook `this`. Provides: `request` (HTTP), `cacheDocList`, logging (`debug/success/error/info/warn`), `imgUtil` (image URL utilities).

### Plugin Normalization Order

`PluginDriver.normalizeOptions()` assembles: `[from, ...plugins, ...to]` — from plugin first, middleware plugins in declared order, to plugins last.

### Base Context Classes

Plugins extend from `src/utils/context/`:
- **`ElogBaseContext`** — shared base
- **`ElogFromContext`** — adds document filtering (`filterDocs`) and batch download helpers
- **`ElogImageContext`** — adds image replacement helpers

## Plugin Development Pattern

Each plugin is a function that accepts config and returns an `IPlugin`:

```typescript
// from plugin — implements download hook
export default function notionPlugin(config: NotionConfig): IPlugin {
  return {
    name: '@elogx-test/plugin-from-notion',
    download: async function() { /* fetch docs */ },
  };
}

// image plugin — implements transform hook
export default function localImagePlugin(config: LocalImageConfig): IPlugin {
  return {
    name: '@elogx-test/plugin-image-local',
    transform: async function(docs) { /* replace image URLs */ return docs; },
  };
}

// to plugin — implements deploy hook
export default function localPlugin(config: LocalConfig): IPlugin {
  return {
    name: '@elogx-test/plugin-to-local',
    deploy: async function(docs) { /* write docs to filesystem */ },
  };
}
```

Plugins declare `@elogx-test/elog` as a `peerDependency` (optional) and `devDependency` (`workspace:*`).

## Configuration

User config file: `elog.config.ts` (or `.js/.cjs/.mjs`), discovered via JoyCon + loaded with `bundle-require` (esbuild). Shape defined in `ElogConfig` (`src/types/common.ts`):

```typescript
interface ElogConfig {
  from: IPlugin;            // exactly one download source
  to: IPlugin | IPlugin[];  // one or more deploy targets
  plugins?: IPlugin[];      // optional transform middleware
  disable?: boolean;        // skip this workflow
  disableCache?: boolean;   // force full sync
  cacheFilePath?: string;   // default: elog.cache.json
}
```

Supports array of configs for multi-workflow setups. CLI entry: `src/cli.ts` (Commander.js) with `init` and `sync` commands.

## Incremental Sync / Caching

- Cache stored in `elog.cache.json` (configurable via `cacheFilePath`)
- `filterDocs()` compares cached vs remote docs by `id` + `updateTime`
- Docs marked `NEW` or `UPDATE`; docs with previous `DOC_ERROR` or `IMAGE_ERROR` status are retried
- Cache is read/written by the `Graph` class

## Publishing

Publish to npm via changesets:

```bash
# 1. Create changeset (interactive: select packages, version bump level, description)
pnpm changeset

# 2. Commit the changeset file
git add .changeset/ && git commit -m "chore: add changeset"

# 3. Bump versions + generate CHANGELOG (consumes .changeset/*.md files)
pnpm version

# 4. Build and publish
pnpm build && pnpm publish

# 5. Push code and git tags
git push --follow-tags
```

CI enforces `changeset status` on PRs to `1.0-dev` — every PR must include a changeset file unless the change is trivial (docs, config).

## Key Conventions

- **ESM-only**: `"type": "module"` in all packages, tsup outputs ESM format only
- **TypeScript strict mode**: `strict: true` in tsconfig
- **Prettier**: 2-space indent, single quotes, trailing commas, 100 char print width (enforced via husky + lint-staged pre-commit hook)
- **No ESLint**: No eslint config in the project
- **No automated test framework**: Only manual integration testing in `tests/test-elog`
- **NPM scope**: `@elogx-test/` during development (rename before production release)
- **Plugin naming**: `@elogx-test/plugin-from-*`, `@elogx-test/plugin-image-*`, `@elogx-test/plugin-to-*`
