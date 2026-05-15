# tsup → tsdown Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 18 buildable packages from tsup to tsdown while keeping build output identical.

**Architecture:** Replace `tsup.config.ts` with minimal `tsdown.config.ts` (only `sourcemap: true`, all other options covered by tsdown defaults), update build scripts and devDependencies in each `package.json`.

**Tech Stack:** tsdown 0.22.x (Rolldown-based), Turborepo, pnpm workspaces

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Delete | `packages/elog/tsup.config.ts` | Old build config |
| Delete | `playground/plugin-*/tsup.config.ts` (×17) | Old build configs |
| Create | `packages/elog/tsdown.config.ts` | New build config |
| Create | `playground/plugin-*/tsdown.config.ts` (×17) | New build configs |
| Modify | `packages/elog/package.json` | Build script + devDep swap |
| Modify | `playground/plugin-*/package.json` (×17) | Build script + devDep swap |

---

### Task 1: Install tsdown and remove tsup from core package

**Files:**
- Delete: `packages/elog/tsup.config.ts`
- Create: `packages/elog/tsdown.config.ts`
- Modify: `packages/elog/package.json`

- [ ] **Step 1: Create new tsdown.config.ts for core package**

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  sourcemap: true,
})
```

Write to `packages/elog/tsdown.config.ts`.

- [ ] **Step 2: Delete old tsup.config.ts**

Run: `rm packages/elog/tsup.config.ts`

- [ ] **Step 3: Update package.json — swap tsup for tsdown**

In `packages/elog/package.json`:
- Change `"build": "tsup"` to `"build": "tsdown"`
- Remove `"tsup": "^6.7.0"` from `devDependencies`
- Add `"tsdown": "^0.22.0"` to `devDependencies`

- [ ] **Step 4: Commit core package migration**

```bash
git add packages/elog/tsdown.config.ts packages/elog/tsup.config.ts packages/elog/package.json
git commit -m "refactor: migrate packages/elog from tsup to tsdown"
```

---

### Task 2: Migrate all 17 playground plugins

All 17 plugins have identical tsup config and identical package.json structure. Process them in batch.

**Files:**
- Delete: `playground/plugin-*/tsup.config.ts` (×17)
- Create: `playground/plugin-*/tsdown.config.ts` (×17)
- Modify: `playground/plugin-*/package.json` (×17)

Plugin directories (all under `playground/`):
- `plugin-from-feishu-space`, `plugin-from-feishu-wiki`, `plugin-from-flowus`, `plugin-from-notion`, `plugin-from-wolai`, `plugin-from-yuque-pwd`, `plugin-from-yuque-token`
- `plugin-image-cos`, `plugin-image-github`, `plugin-image-local`, `plugin-image-oss`, `plugin-image-qiniu`, `plugin-image-upyun`
- `plugin-to-confluence`, `plugin-to-halo`, `plugin-to-local`, `plugin-to-wordpress`

- [ ] **Step 1: Create tsdown.config.ts for all 17 plugins**

Same content as core package:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  sourcemap: true,
})
```

Write to each of the 17 `playground/plugin-*/tsdown.config.ts` paths.

- [ ] **Step 2: Delete all 17 tsup.config.ts files**

Run:
```bash
rm playground/plugin-from-feishu-space/tsup.config.ts playground/plugin-from-feishu-wiki/tsup.config.ts playground/plugin-from-flowus/tsup.config.ts playground/plugin-from-notion/tsup.config.ts playground/plugin-from-wolai/tsup.config.ts playground/plugin-from-yuque-pwd/tsup.config.ts playground/plugin-from-yuque-token/tsup.config.ts playground/plugin-image-cos/tsup.config.ts playground/plugin-image-github/tsup.config.ts playground/plugin-image-local/tsup.config.ts playground/plugin-image-oss/tsup.config.ts playground/plugin-image-qiniu/tsup.config.ts playground/plugin-image-upyun/tsup.config.ts playground/plugin-to-confluence/tsup.config.ts playground/plugin-to-halo/tsup.config.ts playground/plugin-to-local/tsup.config.ts playground/plugin-to-wordpress/tsup.config.ts
```

- [ ] **Step 3: Update all 17 package.json files**

For each plugin's `package.json`:
- Change `"build": "tsup"` to `"build": "tsdown"`
- Remove `"tsup": "^6.7.0"` from `devDependencies`
- Add `"tsdown": "^0.22.0"` to `devDependencies`

- [ ] **Step 4: Commit playground plugins migration**

```bash
git add playground/
git commit -m "refactor: migrate all playground plugins from tsup to tsdown"
```

---

### Task 3: Install dependencies and verify build

- [ ] **Step 1: Run pnpm install to update lockfile**

Run: `pnpm install`

This resolves the new `tsdown` dependency across all 18 packages and removes `tsup` from the lockfile.

- [ ] **Step 2: Run full build**

Run: `pnpm build`

Expected: All 18 packages build successfully with no errors.

- [ ] **Step 3: Verify output structure**

Run:
```bash
ls packages/elog/dist/
ls playground/plugin-from-notion/dist/
```

Expected output files in each `dist/`:
- `index.js` — ESM bundle
- `index.d.ts` — type declarations
- `index.js.map` — source map

- [ ] **Step 4: Verify bin entry still works (core package only)**

Run:
```bash
node packages/elog/bin/elog.js --help
```

Expected: Commander.js help output for the elog CLI.

- [ ] **Step 5: Verify integration test consumer**

Run: `cd tests/test-elog && pnpm install && pnpm build`

Expected: No errors (build script is empty, but workspace dependencies should resolve).

- [ ] **Step 6: Commit lockfile changes**

```bash
git add pnpm-lock.yaml
git commit -m "chore: update lockfile for tsdown migration"
```

---

### Task 4: Update project documentation

- [ ] **Step 1: Update AGENTS.md build tool reference**

In `AGENTS.md`, change `**tsup** (esbuild-based)` to `**tsdown** (Rolldown-based)` and update ESM-only note if needed.

- [ ] **Step 2: Commit documentation update**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md for tsdown build tool"
```
