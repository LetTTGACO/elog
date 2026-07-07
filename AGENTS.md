# AGENTS.md

Guidance for Claude Code / Codex-style agents working in this repository.

## Project Snapshot

Elog is a pnpm/Nx monorepo for syncing documents from writing platforms to
blogging/CMS targets. Workspace packages use the `@elog/` scope and are ESM-only.

Runtime pipeline:

```text
download (from plugin) -> transform (middleware plugins) -> deploy (to plugins)
```

Main package families:

- `packages/elog`: CLI commands, init/export behavior, terminal reporting, plugin registry.
- `packages/core`: config loading/resolution, workflow runtime, cache coordination, sync entrypoints.
- `packages/plugin-sdk`: plugin contracts, document/image types, plugin context helpers, plugin-facing utilities.
- `plugins/from/*`: source plugins such as Notion, Feishu, FlowUs, Yuque, Wolai.
- `plugins/transform/*`: image replacement/rehosting plugins.
- `plugins/to/*`: deploy plugins such as local, Halo, WordPress, Confluence.
- `tests/e2e`: real CLI e2e runner and platform sync cases.

## Commands

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm --filter @elog/cli typecheck
pnpm --filter @elog/cli test

# E2E entry points
pnpm e2e:cli
pnpm e2e:notion-local
pnpm e2e:yuque-pwd-local
pnpm e2e:yuque-token-local
pnpm e2e:notion-wordpress
pnpm e2e:notion-halo
```

Build/test defaults:

- Root build: `nx run-many -t build`
- Root typecheck: `nx run-many -t typecheck`
- Root test: `nx run-many -t test --exclude=@elog/e2e`
- Per-package build: `tsdown`
- Per-package typecheck: `tsc -p tsconfig.json --noEmit --pretty false`
- Nx build output: `{projectRoot}/dist`

Do not commit generated `dist/**`, `.nx/cache/**`, e2e `.tmp/**`, local docs,
images, cache files, or build logs unless explicitly requested.

## Runtime Contracts

Core flow:

```text
Config load/resolve -> WorkflowRunner -> Graph -> PluginDriver -> CacheStore
```

- `elog sync` loads env, loads config, resolves workflows, runs the awaitable
  runtime, then reports `WorkflowResult[]`.
- Runtime/library code returns structured results. Only CLI command boundaries
  translate failures into terminal output or exit codes.
- `Graph.sync()` returns `success`, `skipped`, or `failed`; plugin failures are
  wrapped with plugin and hook metadata.
- `WorkflowRunner` runs workflows serially, skips disabled workflows, and stops
  on the first failed workflow.
- `PluginDriver` lifecycle is `from.download`, transforms in declaration order,
  then one or more `to.deploy` hooks.
- Deploy hooks may run in parallel when configured, so target plugins must not
  rely on side effects from another target plugin.
- Runtime and plugin code must not call `process.exit()`.
- `ctx.logger.error(message)` is plugin-fatal: it prints and throws so
  `PluginDriver` can wrap the failure.
- Do not rely on hook `this` binding in new code.

## Config And Cache

Config discovery uses JoyCon plus `bundle-require`. Default filenames:

- `elog.config.ts`
- `elog.config.js`
- `elog.config.cjs`
- `elog.config.mjs`

Important config behavior:

- A single workflow defaults `cacheFilePath` to `elog.cache.json`.
- Multiple workflows default to `elog.cache1.json`, `elog.cache2.json`, etc.
- `disable: true` workflows are preserved and skipped.
- Malformed 1.0 plugin fields should produce diagnostics before runtime.
- Likely 0.x public configs are detected and reported; full migration is not
  implemented.

Cache behavior:

- Missing cache files mean full sync.
- `disableCache` skips cache loading and forces full sync.
- Cache writes store `sortedDocList` and omit document `body`.

## Plugin Conventions

- Plugin factories return discriminated plugin objects with `name`, `kind`, and
  the lifecycle hook for that kind.
- Internal names use namespace-style strings such as `from:notion`,
  `transform:image-local`, and `to:local`.
- Release package names use `@elog/plugin-*`.
- Plugin packages declare `@elog/cli` as an optional peer dependency and add
  `@elog/cli: "workspace:*"` as a dev dependency.
- Prefer existing context helpers (`ElogFromContext`, `ElogImageContext`,
  `ElogBaseContext`) over duplicating orchestration logic.
- Keep source plugins responsible for `DocDetail[]`, transform plugins
  responsible for document mutation, and deploy plugins responsible for target
  side effects.

## E2E Notes

`tests/e2e` runs the built CLI in temporary workspaces. Real platform cases skip
when required env is missing. The runner loads `tests/e2e/.env` through Vitest
setup.

Useful e2e env controls:

- `ELOG_E2E_CASE`: select one sync case; package scripts usually set this.
- `ELOG_E2E_STREAM_OUTPUT=1`: stream child CLI output while still capturing it.
- `ELOG_E2E_KEEP_TMP=1`: keep successful temporary workspaces for inspection.

Use canonical `ELOG_E2E_*` env names in `.env`. Notion e2e uses database IDs:
`ELOG_E2E_NOTION_TOKEN` and `ELOG_E2E_NOTION_DATABASE_ID`.

## Testing Boundaries

Tests should protect observable behavior and risky contracts, not every helper
line. Prefer the smallest check that would fail for a real regression.

Add or keep tests at behavior boundaries: runtime status and exit codes, config
resolution, cache/incremental sync semantics, plugin hook contracts, document or
image mutation, deploy side effects, and bugs that previously escaped.

Avoid standalone tests for thin wrappers, test-only plumbing, debug toggles, and
logic already exercised through a runner-level e2e path. For e2e infrastructure,
prefer `cli-command` and `sync-matrix` coverage over unit tests for every helper.
When skipping or deleting low-value tests, run the relevant typecheck, format,
build, or e2e verification command instead.

## Release And CI

- CI runs `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm test` on
  pushes/PRs to `v1`.
- Publishing uses Nx Release only. Do not create legacy release-state files or
  use git tags to trigger publishing.
- Only packages listed in `nx.json` `release.projects` are published.
- Private packages must stay private and out of release projects.
- `version.updateDependents` is `never`; shared compatibility is handled by
  semver ranges.
- Do not publish or bump `@elog/cli` just because a plugin or another public
  package changed.
- The one-time bootstrap release has already been completed; do not run it again.

## Coding Conventions

- TypeScript strict mode, ESM imports/exports.
- Prettier: 2-space indent, single quotes, trailing commas, 100 char print width.
- No repository ESLint config.
- Follow existing package structure and local helper APIs.
- Keep changes scoped to the affected package or plugin.
- For comments, first match the density, language, and placement already used
  in the file or nearby module. If there is no local pattern, write fewer
  comments and only when they explain why something exists or name a boundary
  the code alone does not make obvious.
- Prefer comments on core runtime flows, plugin lifecycle ordering, config/cache
  compatibility semantics, error/exit-code contracts, test fixtures that protect
  historical bugs or platform edges, and deliberate simplifications such as
  `ponytail:` notes.
- Avoid comments that restate what the next line does, routine Arrange/Act/Assert
  test markers, and JSDoc `@param` blocks that only repeat TypeScript types.
  `TODO` comments must name the follow-up action or trigger condition; use
  `@deprecated` only for real compatibility periods and point to the replacement
  when possible.
- Do not bulk-clean old comments for style. When editing old code, keep useful
  local style and only remove or rewrite nearby comments that are clearly stale
  or just narrate the code.

## Useful Files

- `packages/core/src/runtime/WorkflowRunner.ts`
- `packages/core/src/runtime/Graph.ts`
- `packages/core/src/runtime/PluginDriver.ts`
- `packages/core/src/cache/CacheStore.ts`
- `packages/core/src/plugins/context.ts`
- `packages/core/src/config/resolve.ts`
- `packages/core/src/config/load.ts`
- `packages/core/src/index.ts`
- `packages/plugin-sdk/src/plugin.ts`
- `packages/plugin-sdk/src/doc.ts`
- `packages/plugin-sdk/src/source.ts`
- `packages/plugin-sdk/src/context-helpers/ImageContext.ts`
- `packages/elog/src/commands/sync/command.ts`
- `tests/fixtures/basic-config/elog.config.ts`

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown under `.scratch/<feature>/`; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The canonical triage roles use the default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain doc layout. See `docs/agents/domain.md`.
