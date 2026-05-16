# Utils Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `packages/elog/src/utils` code into domain-owned directories, delete unused utilities, and trim unused package-root exports.

**Architecture:** This is a behavior-preserving refactor. CLI-only helpers move beside commands/config loading, shared infrastructure moves to `logging/` and `http/`, image and document helpers move to `image/` and `doc/`, and plugin SDK helper classes move under `plugins/context-helpers/`. The package root remains the supported import surface for plugin-used symbols, while internal-only helper exports are removed.

**Tech Stack:** TypeScript ESM, pnpm, Turborepo, tsdown, Vitest, ripgrep.

---

## File Structure

Create or move these files:

- Move `packages/elog/src/utils/elog.ts` to `packages/elog/src/config/defineConfig.ts`.
- Move `packages/elog/src/utils/find-config.ts` to `packages/elog/src/config/find.ts`.
- Move `packages/elog/src/utils/gen-config.ts` to `packages/elog/src/commands/init-config.ts`.
- Move `packages/elog/src/utils/logging.ts` to `packages/elog/src/logging/levels.ts`.
- Move `packages/elog/src/utils/logger.ts` to `packages/elog/src/logging/logger.ts`.
- Move `packages/elog/src/utils/logger.test.ts` to `packages/elog/src/logging/logger.test.ts`.
- Move `packages/elog/src/utils/request.ts` to `packages/elog/src/http/request.ts`.
- Move `packages/elog/src/utils/image.ts` to `packages/elog/src/image/index.ts`.
- Move `packages/elog/src/utils/doc/image.ts` to `packages/elog/src/image/replace.ts`.
- Move `packages/elog/src/utils/doc/form.ts` to `packages/elog/src/doc/download.ts`.
- Move `packages/elog/src/utils/doc/form.test.ts` to `packages/elog/src/doc/download.test.ts`.
- Move `packages/elog/src/utils/context/BaseContext.ts` to `packages/elog/src/plugins/context-helpers/BaseContext.ts`.
- Move `packages/elog/src/utils/context/FromContext.ts` to `packages/elog/src/plugins/context-helpers/FromContext.ts`.
- Move `packages/elog/src/utils/context/ImageContext.ts` to `packages/elog/src/plugins/context-helpers/ImageContext.ts`.
- Move `packages/elog/src/utils/context/index.ts` to `packages/elog/src/plugins/context-helpers/index.ts`.
- Delete `packages/elog/src/utils/getOrCreate.ts`.
- Delete empty `packages/elog/src/utils/doc`, `packages/elog/src/utils/context`, and `packages/elog/src/utils`.

Modify these files:

- `packages/elog/src/index.ts`
- `packages/elog/src/cli.ts`
- `packages/elog/src/commands/init.ts`
- `packages/elog/src/commands/sync.ts`
- `packages/elog/src/cache/CacheStore.ts`
- `packages/elog/src/doc/filter.ts`
- `packages/elog/src/doc/filter.test.ts`
- `packages/elog/src/plugins/context.ts`
- `packages/elog/src/plugins/types.ts`
- Any moved file whose relative imports changed.

---

### Task 1: Move CLI, Config, Logging, And HTTP Helpers

**Files:**

- Create: `packages/elog/src/logging/`
- Create: `packages/elog/src/http/`
- Move: `packages/elog/src/utils/elog.ts`
- Move: `packages/elog/src/utils/find-config.ts`
- Move: `packages/elog/src/utils/gen-config.ts`
- Move: `packages/elog/src/utils/logger.ts`
- Move: `packages/elog/src/utils/logger.test.ts`
- Move: `packages/elog/src/utils/logging.ts`
- Move: `packages/elog/src/utils/request.ts`
- Delete: `packages/elog/src/utils/getOrCreate.ts`

- [ ] **Step 1: Create target directories**

```bash
mkdir -p packages/elog/src/logging packages/elog/src/http
```

Expected: command exits with code `0`.

- [ ] **Step 2: Move files to domain paths**

```bash
mv packages/elog/src/utils/elog.ts packages/elog/src/config/defineConfig.ts
mv packages/elog/src/utils/find-config.ts packages/elog/src/config/find.ts
mv packages/elog/src/utils/gen-config.ts packages/elog/src/commands/init-config.ts
mv packages/elog/src/utils/logging.ts packages/elog/src/logging/levels.ts
mv packages/elog/src/utils/logger.ts packages/elog/src/logging/logger.ts
mv packages/elog/src/utils/logger.test.ts packages/elog/src/logging/logger.test.ts
mv packages/elog/src/utils/request.ts packages/elog/src/http/request.ts
rm packages/elog/src/utils/getOrCreate.ts
```

Expected: command exits with code `0`.

- [ ] **Step 3: Update imports for moved logging, HTTP, config, and init helpers**

Apply these exact import path changes:

```text
packages/elog/src/index.ts:
  ./utils/elog -> ./config/defineConfig

packages/elog/src/cli.ts:
  ./utils/logger -> ./logging/logger

packages/elog/src/commands/sync.ts:
  ../utils/find-config -> ../config/find
  ../utils/logger -> ../logging/logger

packages/elog/src/commands/init.ts:
  ../utils/gen-config -> ./init-config
  ../utils/logger -> ../logging/logger

packages/elog/src/cache/CacheStore.ts:
  ../utils/logger -> ../logging/logger

packages/elog/src/doc/filter.ts:
  ../utils/logger -> ../logging/logger

packages/elog/src/doc/filter.test.ts:
  ../utils/logger -> ../logging/logger

packages/elog/src/plugins/context.ts:
  ../utils/logging -> ../logging/levels
  ../utils/logger -> ../logging/logger
  ../utils/request -> ../http/request

packages/elog/src/plugins/types.ts:
  ../utils/request -> ../http/request

packages/elog/src/logging/logger.ts:
  ./logging -> ./levels
```

Expected: no imports from `utils/logger`, `utils/logging`, `utils/request`, `utils/elog`,
`utils/find-config`, or `utils/gen-config` remain.

- [ ] **Step 4: Verify no stale references to deleted `getOrCreate`**

Run:

```bash
rg "getOrCreate" packages plugins tests
```

Expected: no output and exit code `1`.

---

### Task 2: Move Document Download Helpers Into `doc`

**Files:**

- Move: `packages/elog/src/utils/doc/form.ts` to `packages/elog/src/doc/download.ts`
- Move: `packages/elog/src/utils/doc/form.test.ts` to `packages/elog/src/doc/download.test.ts`
- Modify: `packages/elog/src/doc/download.ts`
- Modify: `packages/elog/src/doc/download.test.ts`
- Modify: `packages/elog/src/plugins/context-helpers/FromContext.ts` after Task 4 creates it

- [ ] **Step 1: Move document helper files**

```bash
mv packages/elog/src/utils/doc/form.ts packages/elog/src/doc/download.ts
mv packages/elog/src/utils/doc/form.test.ts packages/elog/src/doc/download.test.ts
```

Expected: command exits with code `0`.

- [ ] **Step 2: Update imports inside `packages/elog/src/doc/download.ts`**

Change the top imports to:

```ts
import type { DocDetail, SortedDoc } from '../types/doc';
import out from '../logging/logger';
import asyncPool from 'tiny-async-pool';
import { filterDocs } from './filter';

export { filterDocs } from './filter';
export type { DocStatusMap } from './filter';
```

Expected: `download.ts` compiles without `../../doc/filter` or `../logger` imports.

- [ ] **Step 3: Update the moved test import**

Change `packages/elog/src/doc/download.test.ts` to import from the moved file:

```ts
import { getDocDetailList } from './download';
```

Expected: `download.test.ts` no longer references `./form`.

---

### Task 3: Move Image Helpers Into `image`

**Files:**

- Create: `packages/elog/src/image/`
- Move: `packages/elog/src/utils/image.ts` to `packages/elog/src/image/index.ts`
- Move: `packages/elog/src/utils/doc/image.ts` to `packages/elog/src/image/replace.ts`
- Modify: `packages/elog/src/image/index.ts`
- Modify: `packages/elog/src/image/replace.ts`
- Modify: `packages/elog/src/plugins/context.ts`
- Modify: `packages/elog/src/plugins/types.ts`

- [ ] **Step 1: Create image directory and move files**

```bash
mkdir -p packages/elog/src/image
mv packages/elog/src/utils/image.ts packages/elog/src/image/index.ts
mv packages/elog/src/utils/doc/image.ts packages/elog/src/image/replace.ts
```

Expected: command exits with code `0`.

- [ ] **Step 2: Update imports inside `packages/elog/src/image/index.ts`**

Change the top imports to:

```ts
import out from '../logging/logger';
import imgSize from 'image-size';
import request from '../http/request';
import { createHash } from 'node:crypto';
import { ImageUrl } from '../types/image';
```

Expected: `image/index.ts` has no `./logger`, `./request`, or `../types/image` path mistakes.

- [ ] **Step 3: Update imports inside `packages/elog/src/image/replace.ts`**

Change the top imports to:

```ts
import { DocDetail } from '../types/doc';
import out from '../logging/logger';
import { genUniqueIdFromUrl, getBufferFromUrl, getFileType, getUrlListFromContent } from './index';
import { ImageSource, ImageUploader, ImageUrl } from '../types/image';
import { asyncPoolFunc } from '../doc/download';
```

Expected: `replace.ts` has no imports from `../utils`, `../image`, or `./form`.

- [ ] **Step 4: Update image helper imports in plugin context files**

Apply these exact import path changes:

```text
packages/elog/src/plugins/context.ts:
  ../utils/image -> ../image

packages/elog/src/plugins/types.ts:
  ../utils/image -> ../image
```

Expected: `PluginContext.image` still exposes `genUniqueIdFromUrl`, `getFileTypeFromUrl`,
`getFileTypeFromBuffer`, `cleanUrlParam`, `getUrlListFromContent`, `getBaseUrl`, `getFileType`, and
`getBufferFromUrl`.

---

### Task 4: Move Plugin Context Helper Classes Into `plugins/context-helpers`

**Files:**

- Create: `packages/elog/src/plugins/context-helpers/`
- Move: `packages/elog/src/utils/context/BaseContext.ts`
- Move: `packages/elog/src/utils/context/FromContext.ts`
- Move: `packages/elog/src/utils/context/ImageContext.ts`
- Move: `packages/elog/src/utils/context/index.ts`
- Modify: moved context helper files
- Modify: `packages/elog/src/index.ts`

- [ ] **Step 1: Create target directory and move helper classes**

```bash
mkdir -p packages/elog/src/plugins/context-helpers
mv packages/elog/src/utils/context/BaseContext.ts packages/elog/src/plugins/context-helpers/BaseContext.ts
mv packages/elog/src/utils/context/FromContext.ts packages/elog/src/plugins/context-helpers/FromContext.ts
mv packages/elog/src/utils/context/ImageContext.ts packages/elog/src/plugins/context-helpers/ImageContext.ts
mv packages/elog/src/utils/context/index.ts packages/elog/src/plugins/context-helpers/index.ts
```

Expected: command exits with code `0`.

- [ ] **Step 2: Update `BaseContext.ts` import**

Change `packages/elog/src/plugins/context-helpers/BaseContext.ts` to:

```ts
import type { PluginContext } from '../types';

export class ElogBaseContext {
  readonly ctx: PluginContext;
  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
```

Expected: `PluginContext` resolves from `packages/elog/src/plugins/types.ts`.

- [ ] **Step 3: Update `FromContext.ts` imports**

Change the top imports in `packages/elog/src/plugins/context-helpers/FromContext.ts` to:

```ts
import type { DownloadResult, PluginContext } from '../types';
import asyncPool from 'tiny-async-pool';
import {
  asyncPoolFunc,
  DocFrom,
  filterDocs,
  GetDocDetail,
  getDocDetailList,
  GetSortedDocList,
} from '../../doc/download';
import { ElogBaseContext } from './BaseContext';
import { SortedDoc } from '../../types/doc';
```

Expected: no imports from `../doc/form`, `../../plugins/types`, or `../../types/doc` remain in this
file.

- [ ] **Step 4: Update `ImageContext.ts` imports**

Change the top imports in `packages/elog/src/plugins/context-helpers/ImageContext.ts` to:

```ts
import type { PluginContext } from '../types';
import { DocDetail } from '../../types/doc';

import { ElogBaseContext } from './BaseContext';
import { ImageBaseConfig, ImageUploader } from '../../types/image';
import { replaceImagesFunc } from '../../image/replace';
```

Expected: no imports from `../doc/image` or `../../plugins/types` remain in this file.

- [ ] **Step 5: Keep context helper barrel exports**

Ensure `packages/elog/src/plugins/context-helpers/index.ts` contains:

```ts
export { ElogFromContext } from './FromContext';
export { ElogBaseContext } from './BaseContext';
export { ElogImageContext } from './ImageContext';
```

Expected: package-root exports can re-export context helper classes from this barrel.

---

### Task 5: Trim Package Root Exports

**Files:**

- Modify: `packages/elog/src/index.ts`

- [ ] **Step 1: Update `defineConfig` import and context helper export**

Change these lines in `packages/elog/src/index.ts`:

```ts
import { defineConfig } from './config/defineConfig';
```

and:

```ts
export * from './plugins/context-helpers';
```

Expected: `defineConfig`, `ElogBaseContext`, `ElogFromContext`, and `ElogImageContext` remain
available from `@elogx-test/elog`.

- [ ] **Step 2: Remove unused public export of document helper internals**

Delete this line from `packages/elog/src/index.ts`:

```ts
export * from './utils/doc/form';
```

Expected: `asyncPoolFunc`, `getDocDetailList`, `DocFrom`, `GetSortedDocList`, and `GetDocDetail` are
no longer package-root exports.

- [ ] **Step 3: Verify package-root plugin imports remain valid**

Run:

```bash
rg "ElogBaseContext|ElogFromContext|ElogImageContext|defineConfig" packages plugins tests -g '*.ts'
```

Expected: usages from plugins and test configs still import these symbols from `@elogx-test/elog`
or local moved paths that exist.

---

### Task 6: Remove Old `utils` Directory And Stale Imports

**Files:**

- Delete: `packages/elog/src/utils/doc/`
- Delete: `packages/elog/src/utils/context/`
- Delete: `packages/elog/src/utils/`

- [ ] **Step 1: Remove empty old directories**

```bash
rmdir packages/elog/src/utils/doc
rmdir packages/elog/src/utils/context
rmdir packages/elog/src/utils
```

Expected: all three commands exit with code `0`. If one command fails, inspect the remaining files
with `find packages/elog/src/utils -maxdepth 3 -type f | sort` and remove only files already moved
by earlier tasks.

- [ ] **Step 2: Verify no source imports still point at `utils`**

Run:

```bash
rg "utils/" packages/elog/src plugins tests -g '*.ts'
```

Expected: no output and exit code `1`.

- [ ] **Step 3: Verify no files remain under `packages/elog/src/utils`**

Run:

```bash
find packages/elog/src/utils -maxdepth 3 -type f | sort
```

Expected: command exits with a "No such file or directory" message because `utils` has been removed.

---

### Task 7: Run Focused Verification

**Files:**

- Test: `packages/elog/src/doc/download.test.ts`
- Test: `packages/elog/src/logging/logger.test.ts`
- Build: `packages/elog`

- [ ] **Step 1: Run core package tests**

Run:

```bash
pnpm --filter @elogx-test/elog test
```

Expected: Vitest exits with code `0`; `download.test.ts`, `filter.test.ts`, and `logger.test.ts`
pass.

- [ ] **Step 2: Run core package build**

Run:

```bash
pnpm --filter @elogx-test/elog build
```

Expected: tsdown exits with code `0` and emits no unresolved import errors.

- [ ] **Step 3: Fix any import-only failures**

If Step 1 or Step 2 fails with `Cannot find module` or `Cannot find name`, update the import path
named in the error to the corresponding target path from this plan. Then rerun Steps 1 and 2.

Expected: no behavior changes are introduced while resolving moved import paths.

---

### Task 8: Run Workspace Verification And Review Diff

**Files:**

- Build: full workspace
- Test: full workspace
- Review: all modified files

- [ ] **Step 1: Run full workspace build**

Run:

```bash
pnpm build
```

Expected: Turbo exits with code `0`; plugin packages compile against package-root exports.

- [ ] **Step 2: Run full workspace tests**

Run:

```bash
pnpm test
```

Expected: Turbo exits with code `0`.

- [ ] **Step 3: Review changed files**

Run:

```bash
git diff --stat
git diff --check
```

Expected: `git diff --check` exits with code `0`; diff contains only file moves, import path updates,
root export cleanup, and `getOrCreate` deletion.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add packages/elog/src
git commit -m "refactor: reorganize elog utilities"
```

Expected: commit succeeds. Do not add generated `dist/**`, `.turbo/**`, build logs, local docs,
local images, or cache files.

---

## Self-Review

- Spec coverage: The plan covers all spec requirements: domain moves, `getOrCreate` deletion,
  package-root export trimming, `ctx.image.*` preservation, no `utils` compatibility shims, and
  focused plus workspace verification.
- Deferred-marker scan: No incomplete markers or deferred implementation notes remain.
- Type consistency: `PluginContext` remains in `packages/elog/src/plugins/types.ts`; context helper
  classes import it from `../types`; image helper types still derive from the moved `image/index.ts`
  functions.
