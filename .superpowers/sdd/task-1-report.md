# Task 1 Report: Lock And Complete The Stable Init Registry

## Scope

Implemented exactly the Task 1 stable init registry lock:

- added a registry coverage test for the full 1.0 stable plugin matrix
- added a generator coverage test that selects every stable entry and asserts imports/env refs
- completed `packages/elog/src/registry/plugins.json` with the missing stable `yuque-token` and cloud image transform entries

No unrelated init CLI flags, platform support, or generator behavior changes were added.

## TDD Evidence

### 1. Red

Added failing tests first:

- `includes all 1.0 stable plugin registry entries`
- `generates config for every 1.0 stable registry entry`

Ran:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/registry.test.ts
```

Observed expected failures:

- `registry.test.ts` failed because stable entries like `from:yuque-token` and cloud transforms were missing from the built-in registry
- `generator.test.ts` failed because `byKey(...)` could not find those registry entries

### 2. Green

Filled `packages/elog/src/registry/plugins.json` with the required stable entries and env-backed schema fields from the brief:

- `from:yuque-token`
- `transform:image-cos`
- `transform:image-oss`
- `transform:image-github`
- `transform:image-qiniu`
- `transform:image-upyun`
- `transform:image-r2`
- `transform:image-b2`

Then ran:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/registry.test.ts src/commands/init/generator.test.ts
```

Result: PASS.

## Files Changed

- `packages/elog/src/commands/init/registry.test.ts`
- `packages/elog/src/commands/init/generator.test.ts`
- `packages/elog/src/registry/plugins.json`

## Review Checkpoint

Reviewed:

- registry diff to confirm only Task 1 stable entries were added
- generator assertions to confirm imports and env refs cover all required stable plugins

No extra behavior changes were introduced.
