# Repo Structure Consolidation Design

## Goal

Clean up the Elog 1.0 repository structure so that:

- the core runtime and the plugin ecosystem are clearly separated at the top level
- formally maintained plugin packages are no longer stored under a misleading `playground/` directory
- obsolete compatibility shim files inside the core package are removed
- the work stays tightly scoped to structure consolidation rather than expanding into package renaming or smoke-test cleanup

This design intentionally does **not** change npm package names and does **not** touch `tests/test-elog/`.

## Non-Goals

- Renaming published or workspace package names such as `@elogx-test/plugin-from-notion`
- Refactoring the hand-maintained smoke-test workspace under `tests/test-elog/`
- Reworking plugin internals, runtime behavior, or config semantics
- Introducing a staged migration or compatibility layer for old internal import paths

## Current Problems

### `playground/` misrepresents formal plugin packages

The directories under `playground/` are not experiments. They are workspace packages with their own `package.json`, TypeScript build configuration, and publishable outputs. Keeping them under `playground/` makes the repository structure say “temporary or experimental” when the code is actually part of the supported architecture.

### Core package still contains compatibility shells

The core package includes shim files that only re-export newer modules:

- `packages/elog/src/Graph.ts`
- `packages/elog/src/utils/PluginDriver.ts`
- `packages/elog/src/utils/PluginContext.ts`
- `packages/elog/src/utils/load.ts`

These files preserve old paths but blur the 1.0 runtime boundaries. Since this cleanup is intentionally aggressive, they should be removed instead of preserved.

### Some core paths still carry old layering signals

`packages/elog/src/utils/find-config.ts` is not a general utility in the architectural sense. It behaves more like CLI/config boundary code. It does not need to be moved as part of this exact restructuring, but the design should explicitly classify it as a follow-up cleanup target rather than a long-term `utils/` resident.

## Recommended Approach

Use a **structure consolidation** approach:

1. Keep the top-level distinction between core and plugins
2. Preserve `packages/elog` as the core package location
3. Replace `playground/` with a formal `plugins/` tree
4. Group plugins by architectural role: `from`, `transform`, and `to`
5. Remove obsolete compatibility shim files rather than relocating them
6. Leave package names unchanged for now

This gives the repository a much cleaner architectural shape without turning the work into a public package identity migration.

## Alternatives Considered

### Option A: Minimal cleanup only

Delete the obvious shim files and leave `playground/` in place.

Pros:

- lowest migration cost
- smallest diff

Cons:

- formal plugin packages remain under a misleading directory
- repository semantics still do not match the architecture

### Option B: Structure consolidation

Keep `packages/` for core and add a dedicated top-level `plugins/` tree for plugin packages.

Pros:

- aligns the repository layout with the actual architecture
- keeps the scope focused on structure rather than product identity
- avoids unnecessary churn in published package names

Cons:

- requires workspace and documentation path updates
- requires moving all plugin package directories

### Option C: Full package identity redesign

Move plugin directories and rename npm package names at the same time.

Pros:

- cleanest eventual naming system

Cons:

- turns a structure cleanup into a public API and release migration
- substantially larger scope and coordination cost

## Decision

Choose **Option B: Structure consolidation**.

## Target Top-Level Structure

```text
packages/
  elog/

plugins/
  from/
    notion/
    feishu-space/
    feishu-wiki/
    flowus/
    wolai/
    yuque-token/
    yuque-pwd/
  transform/
    image-local/
    image-cos/
    image-oss/
    image-github/
    image-qiniu/
    image-upyun/
  to/
    local/
    halo/
    wordpress/
    confluence/

tests/
  fixtures/
  test-elog/
```

## Plugin Directory Mapping

The physical directory migration should be:

- `playground/plugin-from-notion` -> `plugins/from/notion`
- `playground/plugin-from-feishu-space` -> `plugins/from/feishu-space`
- `playground/plugin-from-feishu-wiki` -> `plugins/from/feishu-wiki`
- `playground/plugin-from-flowus` -> `plugins/from/flowus`
- `playground/plugin-from-wolai` -> `plugins/from/wolai`
- `playground/plugin-from-yuque-token` -> `plugins/from/yuque-token`
- `playground/plugin-from-yuque-pwd` -> `plugins/from/yuque-pwd`
- `playground/plugin-image-local` -> `plugins/transform/image-local`
- `playground/plugin-image-cos` -> `plugins/transform/image-cos`
- `playground/plugin-image-oss` -> `plugins/transform/image-oss`
- `playground/plugin-image-github` -> `plugins/transform/image-github`
- `playground/plugin-image-qiniu` -> `plugins/transform/image-qiniu`
- `playground/plugin-image-upyun` -> `plugins/transform/image-upyun`
- `playground/plugin-to-local` -> `plugins/to/local`
- `playground/plugin-to-halo` -> `plugins/to/halo`
- `playground/plugin-to-wordpress` -> `plugins/to/wordpress`
- `playground/plugin-to-confluence` -> `plugins/to/confluence`

## Core Package Structure Rules

The goal inside `packages/elog/src/` is not a large reorganization. It is a boundary cleanup.

Target structure:

```text
packages/elog/src/
  cli.ts
  index.ts
  node-entry.ts

  cache/
  commands/
  config/
  plugins/
  runtime/
  types/

  utils/
    context/
    doc/
    image.ts
    logger.ts
    logging.ts
    request.ts
```

Rules:

- `runtime/` owns orchestration objects such as `Graph`, `PluginDriver`, and `WorkflowRunner`
- `plugins/` owns plugin-facing contracts, errors, and context creation
- `utils/` is reserved for true shared helpers, not compatibility exports
- no new shim files should be introduced just to preserve old internal paths

## Files To Remove

The following files should be deleted as part of this consolidation:

- `packages/elog/src/Graph.ts`
- `packages/elog/src/utils/PluginDriver.ts`
- `packages/elog/src/utils/PluginContext.ts`
- `packages/elog/src/utils/load.ts`

These files have no independent behavior and exist only to re-export newer module locations.

## Package Naming Policy

Package names should remain unchanged in this effort.

Examples:

- keep `@elogx-test/plugin-from-notion`
- keep `@elogx-test/plugin-image-local`
- keep `@elogx-test/plugin-to-local`

Rationale:

- directory structure cleanup and package identity cleanup are different concerns
- keeping package names stable sharply reduces migration scope
- a future package naming redesign can be evaluated separately once the repository structure is stable

## Workspace And Documentation Impact

This consolidation requires follow-up updates to:

- `pnpm-workspace.yaml`
- documentation that currently describes plugin packages as `playground/plugin-*`
- any local scripts, references, or package filters that assume the old paths

It does **not** require changing package import specifiers in source files, because package names remain the same.

## Treatment Of `tests/test-elog`

`tests/test-elog/` is intentionally out of scope for this design.

It remains a hand-maintained smoke-test and reference workspace. Even if some files in that directory are outdated, they should not be cleaned up as part of this structure consolidation. That work can happen later in a dedicated pass once the main repository structure is settled.

## Error Handling And Risk Notes

### Main risk

The main risk is incomplete path updating after moving plugin directories. This could affect workspace discovery, documentation, package filters, or local commands that assume the old `playground/` paths.

### Mitigation

- keep package names unchanged
- keep the migration focused on directory moves and path updates
- avoid mixing unrelated refactors into the same change

## Testing Expectations

This design does not add new runtime behavior, so verification should focus on repository integrity:

- workspace discovery still includes all plugin packages
- root build still resolves all moved workspaces
- package-local builds still work from their new paths
- existing core tests still pass

`tests/test-elog/` is not part of the acceptance criteria for this consolidation.

## Acceptance Criteria

- `playground/` no longer hosts formal plugin packages
- plugin packages live under `plugins/from`, `plugins/transform`, and `plugins/to`
- `packages/elog` remains the core package root
- the four compatibility shim files are removed
- package names remain unchanged
- `tests/test-elog/` remains untouched
- repository docs and workspace configuration reflect the new structure

## Follow-Up Topics

These are intentionally deferred:

- whether `@elogx-test/plugin-*` package names should be redesigned later
- whether `packages/elog/src/utils/find-config.ts` should move into a clearer config or CLI boundary
- whether smoke-test assets and legacy scripts in `tests/test-elog/` should be normalized
