# Repo Structure Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move formal plugin packages from `playground/` into a top-level `plugins/` tree, update workspace/docs to match, and delete the four obsolete core compatibility shim files without changing npm package names or touching `tests/test-elog/`.

**Architecture:** This is a repository-shape change, not a runtime redesign. Keep `packages/elog` as the core package root, create `plugins/from`, `plugins/transform`, and `plugins/to` as the formal plugin package roots, then update workspace metadata and repository docs so all official paths point to the new structure. Finish by deleting the four obsolete re-export shim files after confirming nothing still imports them.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript, tsdown, ripgrep, git

---

## File Structure Map

### New directories

- Create: `plugins/from/`
- Create: `plugins/transform/`
- Create: `plugins/to/`

### Directories to move

- Move: `playground/plugin-from-notion/` -> `plugins/from/notion/`
- Move: `playground/plugin-from-feishu-space/` -> `plugins/from/feishu-space/`
- Move: `playground/plugin-from-feishu-wiki/` -> `plugins/from/feishu-wiki/`
- Move: `playground/plugin-from-flowus/` -> `plugins/from/flowus/`
- Move: `playground/plugin-from-wolai/` -> `plugins/from/wolai/`
- Move: `playground/plugin-from-yuque-token/` -> `plugins/from/yuque-token/`
- Move: `playground/plugin-from-yuque-pwd/` -> `plugins/from/yuque-pwd/`
- Move: `playground/plugin-image-local/` -> `plugins/transform/image-local/`
- Move: `playground/plugin-image-cos/` -> `plugins/transform/image-cos/`
- Move: `playground/plugin-image-oss/` -> `plugins/transform/image-oss/`
- Move: `playground/plugin-image-github/` -> `plugins/transform/image-github/`
- Move: `playground/plugin-image-qiniu/` -> `plugins/transform/image-qiniu/`
- Move: `playground/plugin-image-upyun/` -> `plugins/transform/image-upyun/`
- Move: `playground/plugin-to-local/` -> `plugins/to/local/`
- Move: `playground/plugin-to-halo/` -> `plugins/to/halo/`
- Move: `playground/plugin-to-wordpress/` -> `plugins/to/wordpress/`
- Move: `playground/plugin-to-confluence/` -> `plugins/to/confluence/`

### Files to modify

- Modify: `pnpm-workspace.yaml`
- Modify: `AGENTS.md`
- Modify: `pnpm-lock.yaml` after workspace relink

### Files to delete

- Delete: `packages/elog/src/Graph.ts`
- Delete: `packages/elog/src/utils/PluginDriver.ts`
- Delete: `packages/elog/src/utils/PluginContext.ts`
- Delete: `packages/elog/src/utils/load.ts`

### Files to inspect during verification

- Inspect: `packages/elog/src/index.ts`
- Inspect: `packages/elog/src/runtime/WorkflowRunner.ts`
- Inspect: `packages/elog/src/commands/sync.ts`
- Inspect: `docs/superpowers/specs/2026-05-16-repo-structure-consolidation-design.md`

---

### Task 1: Update Workspace Metadata And Repository Guidance

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `AGENTS.md`
- Test: workspace path checks via `rg` and `pnpm`

- [ ] **Step 1: Capture the current path references that must disappear**

Run:

```bash
rg -n 'playground/plugin-|playground/\*|utils/load\.ts' AGENTS.md pnpm-workspace.yaml
```

Expected: matches in both files showing the legacy `playground/*` workspace path and the old compatibility note for `packages/elog/src/utils/load.ts`.

- [ ] **Step 2: Update `pnpm-workspace.yaml` to the new plugin roots**

Replace the file with:

```yaml
packages:
  - 'packages/*'
  - 'plugins/from/*'
  - 'plugins/transform/*'
  - 'plugins/to/*'
  - 'tests/*'
allowBuilds:
  esbuild: true
```

- [ ] **Step 3: Update `AGENTS.md` so repository guidance matches the new structure**

Make these content changes in `AGENTS.md`:

```md
- `plugins/from/*`: download from Notion, Feishu Wiki/Space, FlowUs, Yuque Token/Pwd, Wolai
- `plugins/transform/*`: replace/rehost images via COS, OSS, GitHub, Qiniu, Upyun, local
- `plugins/to/*`: deploy to Halo, WordPress, Confluence, local filesystem
```

```md
cd plugins/from/notion && pnpm build
```

```md
| `plugins/from/*` | Source/download plugins |
| `plugins/transform/*` | Transform plugins for image replacement/rehosting |
| `plugins/to/*` | Target/deploy plugins |
```

```yaml
packages:
  - "packages/*"
  - "plugins/from/*"
  - "plugins/transform/*"
  - "plugins/to/*"
  - "tests/*"
```

And change this sentence:

```md
plus `bundle-require`. `packages/elog/src/utils/load.ts` is only a compatibility
re-export.
```

to:

```md
plus `bundle-require`.
```

- [ ] **Step 4: Verify the legacy path references are gone from the workspace metadata and repo guide**

Run:

```bash
rg -n 'playground/plugin-|playground/\*|utils/load\.ts' AGENTS.md pnpm-workspace.yaml
```

Expected: no output.

- [ ] **Step 5: Commit the metadata/doc sync**

Run:

```bash
git add pnpm-workspace.yaml AGENTS.md
git commit -m "chore: update workspace paths for plugins tree"
```

Expected: a commit containing only workspace metadata and repository guidance updates.

---

### Task 2: Move Plugin Packages Into The Formal `plugins/` Tree

**Files:**
- Create: `plugins/from/`
- Create: `plugins/transform/`
- Create: `plugins/to/`
- Move: all 17 plugin package directories listed in the file structure map
- Modify: `pnpm-lock.yaml`
- Test: workspace relink and package-local builds

- [ ] **Step 1: Prove the new package paths do not exist yet**

Run:

```bash
test -d plugins/from/notion && echo "unexpected-exists" || echo "missing-as-expected"
test -d plugins/transform/image-local && echo "unexpected-exists" || echo "missing-as-expected"
test -d plugins/to/local && echo "unexpected-exists" || echo "missing-as-expected"
```

Expected:

```text
missing-as-expected
missing-as-expected
missing-as-expected
```

- [ ] **Step 2: Create the new plugin family directories**

Run:

```bash
mkdir -p plugins/from plugins/transform plugins/to
```

Expected: command exits successfully with no output.

- [ ] **Step 3: Move all `from` plugins into `plugins/from/`**

Run:

```bash
mv playground/plugin-from-notion plugins/from/notion
mv playground/plugin-from-feishu-space plugins/from/feishu-space
mv playground/plugin-from-feishu-wiki plugins/from/feishu-wiki
mv playground/plugin-from-flowus plugins/from/flowus
mv playground/plugin-from-wolai plugins/from/wolai
mv playground/plugin-from-yuque-token plugins/from/yuque-token
mv playground/plugin-from-yuque-pwd plugins/from/yuque-pwd
```

Expected: all seven directories move with no errors.

- [ ] **Step 4: Move all `transform` plugins into `plugins/transform/`**

Run:

```bash
mv playground/plugin-image-local plugins/transform/image-local
mv playground/plugin-image-cos plugins/transform/image-cos
mv playground/plugin-image-oss plugins/transform/image-oss
mv playground/plugin-image-github plugins/transform/image-github
mv playground/plugin-image-qiniu plugins/transform/image-qiniu
mv playground/plugin-image-upyun plugins/transform/image-upyun
```

Expected: all six directories move with no errors.

- [ ] **Step 5: Move all `to` plugins into `plugins/to/`**

Run:

```bash
mv playground/plugin-to-local plugins/to/local
mv playground/plugin-to-halo plugins/to/halo
mv playground/plugin-to-wordpress plugins/to/wordpress
mv playground/plugin-to-confluence plugins/to/confluence
```

Expected: all four directories move with no errors.

- [ ] **Step 6: Refresh the workspace links and lockfile**

Run:

```bash
pnpm install
```

Expected: pnpm updates workspace links successfully and rewrites `pnpm-lock.yaml` path references away from `playground/`.

- [ ] **Step 7: Verify the moved workspace package paths resolve from their new locations**

Run:

```bash
pnpm --filter ./plugins/from/notion build
pnpm --filter ./plugins/transform/image-local build
pnpm --filter ./plugins/to/local build
```

Expected: each build completes successfully from the new physical package path.

- [ ] **Step 8: Verify there are no leftover lockfile or workspace references to `playground/` plugin package roots**

Run:

```bash
rg -n 'playground/plugin-|link:\.\./\.\./playground/' pnpm-lock.yaml pnpm-workspace.yaml
```

Expected: no output.

- [ ] **Step 9: Commit the plugin directory migration**

Run:

```bash
git add plugins/ playground/ pnpm-lock.yaml
git commit -m "refactor: move plugin packages into formal tree"
```

Expected: a commit containing the directory moves and lockfile relink updates.

---

### Task 3: Delete The Obsolete Core Compatibility Shim Files

**Files:**
- Delete: `packages/elog/src/Graph.ts`
- Delete: `packages/elog/src/utils/PluginDriver.ts`
- Delete: `packages/elog/src/utils/PluginContext.ts`
- Delete: `packages/elog/src/utils/load.ts`
- Inspect: `packages/elog/src/index.ts`
- Inspect: `packages/elog/src/runtime/WorkflowRunner.ts`
- Inspect: `packages/elog/src/commands/sync.ts`

- [ ] **Step 1: Confirm the core package already imports the canonical runtime/plugin modules**

Run:

```bash
sed -n '1,80p' packages/elog/src/index.ts
sed -n '1,40p' packages/elog/src/runtime/WorkflowRunner.ts
sed -n '1,80p' packages/elog/src/commands/sync.ts
```

Expected:

- `packages/elog/src/index.ts` exports `Graph` from `./runtime/Graph` and `PluginDriver` from `./runtime/PluginDriver`
- `packages/elog/src/runtime/WorkflowRunner.ts` imports `Graph` from `./Graph`
- `packages/elog/src/commands/sync.ts` imports `findConfig` from `../utils/find-config`, not from `utils/load.ts`

- [ ] **Step 2: Search for any remaining imports of the compatibility shim paths before deletion**

Run:

```bash
rg -n "from './Graph'|from '../Graph'|utils/PluginDriver|utils/PluginContext|utils/load" packages playground plugins tests -g "*.ts" -g "!**/dist/**" -g "!**/node_modules/**"
```

Expected: only canonical runtime imports remain, and there are no live consumers that still need the shim paths.

- [ ] **Step 3: Delete the four shim files**

Run:

```bash
rm packages/elog/src/Graph.ts
rm packages/elog/src/utils/PluginDriver.ts
rm packages/elog/src/utils/PluginContext.ts
rm packages/elog/src/utils/load.ts
```

Expected: all four files are removed successfully.

- [ ] **Step 4: Verify the shim files are gone and no source imports still reference them**

Run:

```bash
test -f packages/elog/src/Graph.ts && echo "unexpected-file"
test -f packages/elog/src/utils/PluginDriver.ts && echo "unexpected-file"
test -f packages/elog/src/utils/PluginContext.ts && echo "unexpected-file"
test -f packages/elog/src/utils/load.ts && echo "unexpected-file"
rg -n "utils/PluginDriver|utils/PluginContext|utils/load" packages plugins tests -g "*.ts" -g "!**/dist/**" -g "!**/node_modules/**"
```

Expected: no `unexpected-file` output and no `rg` matches.

- [ ] **Step 5: Commit the shim cleanup**

Run:

```bash
git add packages/elog/src
git commit -m "refactor: remove obsolete core compatibility shims"
```

Expected: a commit deleting only the four shim files.

---

### Task 4: Run End-To-End Repository Verification

**Files:**
- Inspect: `AGENTS.md`
- Inspect: `pnpm-workspace.yaml`
- Inspect: `pnpm-lock.yaml`
- Test: core tests and representative plugin builds

- [ ] **Step 1: Verify the repository only documents the new plugin roots in active guidance files**

Run:

```bash
rg -n 'playground/plugin-|playground/\*' AGENTS.md pnpm-workspace.yaml
```

Expected: no output.

Note: do not treat historical docs under `docs/superpowers/` as failures for this step; those files are historical artifacts, not active repo guidance.

- [ ] **Step 2: Run the core automated test suite**

Run:

```bash
pnpm --filter @elogx-test/elog test
```

Expected: Vitest passes for the core package.

- [ ] **Step 3: Run a full monorepo build from the new workspace layout**

Run:

```bash
pnpm build
```

Expected: Turbo completes successfully and resolves all moved plugin workspaces from `plugins/`.

- [ ] **Step 4: Capture the final tree and changed files for review**

Run:

```bash
find plugins -maxdepth 2 -mindepth 2 -type d | sort
git status --short
```

Expected:

- the `plugins/from`, `plugins/transform`, and `plugins/to` directories each list the expected package directories
- `git status --short` shows a clean working tree if all commits were made in the earlier tasks

- [ ] **Step 5: Commit any final verification-only metadata changes if they were generated**

Run:

```bash
git add pnpm-lock.yaml
git commit -m "chore: finalize repo structure consolidation verification"
```

Expected: either no-op because there is nothing left to commit, or a tiny commit containing only verification-generated lockfile normalization.

---

## Self-Review

### Spec coverage

- Top-level split between core and plugins: covered by Task 1 and Task 2
- `playground/` replacement with `plugins/`: covered by Task 2
- Four compatibility shim deletions: covered by Task 3
- Package names remain unchanged: enforced by Task 2 using directory moves only, with no `package.json` name edits
- `tests/test-elog/` untouched: preserved by all tasks and explicitly excluded from moves and verification gates
- Workspace/docs reflect new structure: covered by Task 1 and Task 4

### Placeholder scan

- No `TODO`/`TBD` placeholders remain
- Every mutation step includes an exact command or exact replacement content
- Every verification step includes an explicit command and expected result

### Type and path consistency

- New plugin roots are consistently `plugins/from/*`, `plugins/transform/*`, and `plugins/to/*`
- The four deleted shim paths are referenced consistently across all tasks
- No task changes npm package names or `tests/test-elog/`
