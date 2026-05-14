# Rush → Turborepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from Rush 5.118.7 to pnpm workspaces + Turborepo + changesets, removing all Rush infrastructure.

**Architecture:** Replace Rush's workspace orchestration with pnpm workspaces, build orchestration with Turborepo, version management with changesets, and git hooks with husky + lint-staged. Package source code stays unchanged.

**Tech Stack:** pnpm 11.1.2, Turborepo, @changesets/cli, husky, lint-staged, tsup (unchanged)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `pnpm-workspace.yaml` | Create | Declare workspace packages |
| `turbo.json` | Create | Build task orchestration + caching |
| `package.json` (root) | Create | Root devDependencies + lint-staged config |
| `.npmrc` | Create | Registry mirror config (was in Rush's `.npmrc`) |
| `.husky/pre-commit` | Create | Run lint-staged on commit |
| `.husky/commit-msg` | Create | Validate commit message has 2+ words |
| `.changeset/config.json` | Create | Changesets configuration |
| `.github/workflows/ci.yml` | Modify | Replace Rush commands with pnpm/turbo/changesets |
| `.nvmrc` | Modify | Update Node.js version for pnpm 11 |
| `.run/*.run.xml` | Modify | Replace `rush build`/`rushx build` with `turbo build`/`pnpm build` |
| `rush.json` | Delete | Rush main config |
| `common/` | Delete | Entire Rush infrastructure directory |
| `packages/elog/package.json` | Modify | No changes needed (no `//` fields) |
| `playground/*/package.json` | Modify | No changes needed (no `//` fields) |
| `tests/test-elog/package.json` | Modify | No changes needed |

---

### Task 1: Create pnpm-workspace.yaml and root package.json

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`

- [ ] **Step 1: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "playground/*"
  - "tests/*"
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "elog-monorepo",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.1.2",
  "devDependencies": {
    "turbo": "^2.5.0",
    "@changesets/cli": "^2.29.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.5.0",
    "prettier": "^2.7.1"
  },
  "lint-staged": {
    "*.{ts,js,json,md}": "prettier --write"
  },
  "scripts": {
    "build": "turbo build",
    "prepare": "husky"
  }
}
```

- [ ] **Step 3: Create .npmrc at root**

```ini
registry=https://registry.npmmirror.com/
```

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml package.json .npmrc
git commit -m "feat: add pnpm workspace and root package.json for Turborepo migration"
```

---

### Task 2: Create turbo.json

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add turbo.json
git commit -m "feat: add turbo.json for build orchestration"
```

---

### Task 3: Initialize changesets

**Files:**
- Create: `.changeset/config.json`

- [ ] **Step 1: Create .changeset directory and config**

```bash
mkdir -p .changeset
```

Write `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "1.0-dev",
  "updateInternalDependencies": "patch",
  "ignore": ["test-elog"]
}
```

- [ ] **Step 2: Create .changeset/README.md**

```markdown
# Changesets

This folder contains changeset files created by `pnpm changeset`.
```

- [ ] **Step 3: Commit**

```bash
git add .changeset/
git commit -m "feat: initialize changesets for version management"
```

---

### Task 4: Set up husky + lint-staged git hooks

**Files:**
- Create: `.husky/pre-commit`
- Create: `.husky/commit-msg`

- [ ] **Step 1: Create .husky directory and pre-commit hook**

```bash
mkdir -p .husky
```

Write `.husky/pre-commit`:

```bash
pnpm exec lint-staged
```

- [ ] **Step 2: Create commit-msg hook**

Write `.husky/commit-msg`:

```bash
if [ $(cat "$1" | wc -w) -lt 2 ]; then
  echo ""
  echo "Invalid commit message: The message must contain at least 2 words."
  exit 1
fi
```

- [ ] **Step 3: Make hooks executable**

```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

- [ ] **Step 4: Commit**

```bash
git add .husky/
git commit -m "feat: add husky git hooks with lint-staged and commit-msg validation"
```

---

### Task 5: Update CI pipeline

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Rewrite ci.yml**

Replace the entire file content:

```yaml
name: CI
on:
  push:
    branches: ['1.0-dev']
  pull_request:
    branches: ['1.0-dev']
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 2
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Verify Change Logs
        run: npx changeset status --since=origin/1.0-dev
      - name: Build
        run: pnpm turbo build --force
```

Key changes:
- Added `pnpm/action-setup@v4` to install pnpm
- Node.js version updated to 22 (compatible with pnpm 11)
- `rush install` → `pnpm install --frozen-lockfile`
- `rush change --verify` → `npx changeset status --since=origin/1.0-dev`
- `rush rebuild` → `pnpm turbo build --force`
- Removed `snow-actions/git-config-user` (not needed without `rush change`)
- Added `cache: pnpm` for CI caching

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: update CI pipeline from Rush to pnpm/turborepo/changesets"
```

---

### Task 6: Update .nvmrc for Node.js 22

**Files:**
- Modify: `.nvmrc`

- [ ] **Step 1: Update .nvmrc**

```
v22.0.0
```

Node.js 22 is the current LTS and required by pnpm 11.

- [ ] **Step 2: Commit**

```bash
git add .nvmrc
git commit -m "chore: update Node.js version to 22 for pnpm 11 compatibility"
```

---

### Task 7: Update IntelliJ run configurations

**Files:**
- Modify: `.run/build-all.run.xml`
- Modify: `.run/build-cli.run.xml`
- Modify: `.run/build-elog.run.xml`
- Modify: `.run/build-from-yuque.run.xml`
- Modify: `.run/build-image-local.run.xml`
- Modify: `.run/build-to-local.run.xml`

- [ ] **Step 1: Update build-all.run.xml**

Replace `SCRIPT_TEXT` value from `rush build` to `turbo build`:

```xml
<option name="SCRIPT_TEXT" value="turbo build" />
```

- [ ] **Step 2: Update build-cli.run.xml**

Replace `SCRIPT_TEXT` value from `rushx build` to `pnpm build`:

```xml
<option name="SCRIPT_TEXT" value="pnpm build" />
```

- [ ] **Step 3: Update build-elog.run.xml**

Replace `SCRIPT_TEXT` value from `rushx build` to `pnpm build`:

```xml
<option name="SCRIPT_TEXT" value="pnpm build" />
```

- [ ] **Step 4: Update build-from-yuque.run.xml**

Replace `SCRIPT_TEXT` value from `rushx build` to `pnpm build`:

```xml
<option name="SCRIPT_TEXT" value="pnpm build" />
```

- [ ] **Step 5: Update build-image-local.run.xml**

Replace `SCRIPT_TEXT` value from `rushx build` to `pnpm build`:

```xml
<option name="SCRIPT_TEXT" value="pnpm build" />
```

- [ ] **Step 6: Update build-to-local.run.xml**

Replace `SCRIPT_TEXT` value from `rushx build` to `pnpm build`:

```xml
<option name="SCRIPT_TEXT" value="pnpm build" />
```

- [ ] **Step 7: Commit**

```bash
git add .run/
git commit -m "chore: update IntelliJ run configs from rush to turbo/pnpm"
```

---

### Task 8: Delete Rush infrastructure

**Files:**
- Delete: `rush.json`
- Delete: `common/` (entire directory)

- [ ] **Step 1: Delete rush.json**

```bash
git rm rush.json
```

- [ ] **Step 2: Delete common/ directory**

```bash
git rm -r common/
```

This removes:
- `common/config/rush/` — all Rush configuration files
- `common/scripts/` — install-run-rush.js and helpers
- `common/git-hooks/` — Rush-managed git hooks
- `common/autoinstallers/` — rush-prettier autoinstaller
- `common/temp/` — Rush temporary files (pnpm-store, pnpm-lock, etc.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove Rush infrastructure (rush.json and common/)"
```

---

### Task 9: Clean up empty plugin directory

**Files:**
- Delete: `playground/plugin-from-local/` (empty directory, no package.json)

- [ ] **Step 1: Remove empty directory**

```bash
rm -rf playground/plugin-from-local/
```

This directory was noted as empty during exploration — not registered in rush.json and contains no source files.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove empty plugin-from-local directory"
```

---

### Task 10: Install dependencies and generate lockfile

**Files:**
- Create: `pnpm-lock.yaml` (generated)

- [ ] **Step 1: Ensure pnpm 11 is available**

```bash
corepack enable
corepack prepare pnpm@11.1.2 --activate
```

Or install directly:
```bash
npm install -g pnpm@11.1.2
```

- [ ] **Step 2: Run pnpm install**

```bash
pnpm install
```

This generates a fresh `pnpm-lock.yaml` compatible with pnpm 11. Expected: all workspace packages resolve successfully.

- [ ] **Step 3: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "feat: add pnpm 11 lockfile"
```

---

### Task 11: Initialize husky and verify full build

**Files:**
- None (verification task)

- [ ] **Step 1: Initialize husky**

```bash
pnpm exec husky init
```

This sets up the `.husky/` directory git config. The hooks created in Task 4 should already be in place, so husky init will wire them to git.

If `husky init` overwrites existing hooks, re-apply the hook content from Task 4.

- [ ] **Step 2: Run full build to verify**

```bash
pnpm turbo build
```

Expected: all 18 packages build successfully with tsup, outputs in `dist/` directories.

- [ ] **Step 3: Run full build with --force to verify cache miss path**

```bash
pnpm turbo build --force
```

Expected: same result, all packages rebuild from scratch.

- [ ] **Step 4: Test single-package build**

```bash
pnpm --filter @elogx-test/elog build
```

Expected: elog core package builds successfully.

- [ ] **Step 5: Test incremental build (cache hit)**

```bash
pnpm turbo build
```

Expected: all packages show `FULL TURBO` (cache hit), build completes instantly.

- [ ] **Step 6: Commit any husky initialization changes**

```bash
git add -A
git commit -m "chore: initialize husky and verify build pipeline"
```

---

### Task 12: Final cleanup and verification

**Files:**
- Various (cleanup)

- [ ] **Step 1: Verify no Rush references remain**

```bash
grep -r "rush" --include="*.json" --include="*.yml" --include="*.yaml" --include="*.xml" --include="*.ts" --include="*.js" --include="*.sh" --include="*.md" . | grep -v node_modules | grep -v ".git/"
```

Expected: no references to `rush`, `rushx`, or `install-run-rush` remain.

- [ ] **Step 2: Verify .gitignore is clean**

Check that `common/temp/` entries (if any) are removed and `node_modules/` and `.turbo/` are properly ignored.

Add to `.gitignore` if not present:

```
.turbo/
node_modules/
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after Rush to Turborepo migration"
```
