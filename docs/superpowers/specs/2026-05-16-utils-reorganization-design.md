# Utils Reorganization Design

## Goal

`packages/elog/src/utils` currently mixes unrelated responsibilities: CLI helpers, config helpers,
logging, HTTP, image utilities, document download helpers, and plugin context helper classes. This
makes it harder to understand which code belongs to the runtime, which code is part of the plugin
SDK, and which code is only command-line support.

This refactor will remove the broad `utils` bucket and move code into the existing domain-oriented
architecture. The end state should make each module's owner obvious from its path.

## Current Findings

- `utils/getOrCreate.ts` has no repository references and should be deleted.
- `utils/elog.ts` only exports `defineConfig`; it belongs with config-facing public helpers.
- `utils/find-config.ts` is only used by `commands/sync.ts`; it belongs near config loading or the
  sync command boundary.
- `utils/gen-config.ts` is only used by `commands/init.ts`; it belongs near init command support.
- `utils/logger.ts` and `utils/logging.ts` are runtime logging infrastructure, not generic utils.
- `utils/request.ts` is the shared HTTP client and is exposed to plugins through `PluginContext`.
- `utils/image.ts` and `utils/doc/image.ts` are image-domain helpers used by `PluginContext` and
  image transform helpers.
- `utils/doc/form.ts` is document download/incremental-sync support used internally by
  `ElogFromContext`; plugins do not import it directly from the package root.
- `utils/context/*` contains plugin SDK helper classes used by plugins through `@elogx-test/elog`.

## Target Layout

Move files into domain directories:

```text
packages/elog/src/
  config/
    defineConfig.ts
    find.ts
  commands/
    init-config.ts
  logging/
    levels.ts
    logger.ts
  http/
    request.ts
  image/
    index.ts
    replace.ts
  doc/
    download.ts
    filter.ts
  plugins/
    context-helpers/
      BaseContext.ts
      FromContext.ts
      ImageContext.ts
      index.ts
```

`packages/elog/src/utils` should be removed if it becomes empty. If a future truly generic helper is
needed, a new `utils` directory can be reintroduced intentionally.

## Public API Boundary

The package root should export only the API that plugins or user configs currently need:

- `defineConfig`
- plugin contracts and runtime context types
- document, image, common, and logging types
- `ElogBaseContext`, `ElogFromContext`, and `ElogImageContext`
- runtime classes already exposed today, such as `Graph`, `PluginDriver`, and `WorkflowRunner`

Remove the root export of `utils/doc/form`. Helpers such as `asyncPoolFunc`, `getDocDetailList`,
`DocFrom`, `GetSortedDocList`, and `GetDocDetail` should become internal unless direct plugin usage
appears later.

Keep `ctx.image.*` available on `PluginContext`; multiple plugins use these helpers through the
context object.

## Migration Strategy

1. Move each file to its target domain path.
2. Update internal imports across `packages/elog/src`.
3. Update plugin imports only if they reference moved symbols through source paths. Imports from
   `@elogx-test/elog` should continue to work through the package root.
4. Remove unused exports from `packages/elog/src/index.ts`.
5. Delete `utils/getOrCreate.ts`.
6. Delete the old `utils` directory after all imports are updated.

No compatibility shim files should be left under `utils`; the purpose of this refactor is to remove
the ambiguous directory rather than preserve it as a hidden alias layer.

## Testing

Run focused tests first:

```bash
pnpm --filter @elogx-test/elog test
```

Then run the package build to catch moved import/type declaration issues:

```bash
pnpm --filter @elogx-test/elog build
```

If those pass, run the full workspace checks:

```bash
pnpm build
pnpm test
```

## Non-Goals

- Do not change plugin lifecycle behavior.
- Do not change `PluginContext` shape except for internal import paths.
- Do not redesign logging behavior or make library/runtime exit behavior changes.
- Do not migrate 0.x config compatibility behavior.
- Do not commit generated `dist/**` output.
