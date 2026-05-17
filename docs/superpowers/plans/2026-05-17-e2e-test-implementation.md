# E2E Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an opt-in e2e test workspace that runs the real `elog` CLI and a real Yuque-to-local sync flow.

**Architecture:** Add `tests/e2e` as a dedicated pnpm workspace package. Tests are Vitest entrypoints that load registry-style case files, create isolated temporary workspaces, spawn the real CLI entrypoint, and run shared plus case-specific assertions.

**Tech Stack:** pnpm workspaces, Turbo build, Vitest, TypeScript ESM, Node `child_process.spawn`, Node filesystem APIs.

---

## File Structure

- Create `tests/e2e/package.json`: e2e workspace package, scripts, workspace dependencies.
- Create `tests/e2e/vitest.config.ts`: e2e-only Vitest config with longer timeout.
- Runtime-generated `tests/e2e/.tmp/`: ignored local e2e workspaces and artifacts.
- Modify `package.json`: add root manual scripts `e2e`, `e2e:cli`, and `e2e:yuque-local`.
- Modify `.gitignore`: ignore `tests/e2e/.tmp/` local e2e workspaces.
- Create `tests/e2e/src/helpers/types.ts`: shared TypeScript interfaces for CLI results, command cases, sync cases, and temporary workspaces.
- Create `tests/e2e/src/helpers/run-cli.ts`: spawn the real `packages/elog/bin/elog.js` and capture stdout, stderr, exit code, and signal.
- Create `tests/e2e/src/helpers/temp-workspace.ts`: create, populate, preserve, and clean isolated temporary workspaces.
- Create `tests/e2e/src/helpers/assertions.ts`: reusable assertions for command output, files, directories, JSON cache, markdown counts, and image counts.
- Create `tests/e2e/src/helpers/command-case-loader.ts`: load `command-cases/*.case.ts` definitions.
- Create `tests/e2e/src/helpers/case-loader.ts`: load sync `cases/*/case.ts` definitions and apply `ELOG_E2E_CASE`.
- Create `tests/e2e/src/cli-command.e2e.test.ts`: generic command e2e runner.
- Create `tests/e2e/src/sync-matrix.e2e.test.ts`: generic sync case matrix runner.
- Create `tests/e2e/command-cases/version.case.ts`: `elog --version`.
- Create `tests/e2e/command-cases/init-dry-run.case.ts`: `elog init --dry-run`.
- Create `tests/e2e/command-cases/sync-missing-config.case.ts`: failure path for missing config.
- Create `tests/e2e/command-cases/sync-offline-fixture.case.ts`: offline `elog sync` success path using the existing fixture.
- Create `tests/e2e/cases/yuque-image-local-to-local/case.ts`: Yuque sync case metadata and assertions.
- Create `tests/e2e/cases/yuque-image-local-to-local/elog.config.ts`: real e2e config for Yuque, image-local, and to-local.
- Create `tests/e2e/cases/yuque-image-local-to-local/README.md`: manual setup instructions for env and test repository content.

---

### Task 1: Add The E2E Workspace Package

**Files:**
- Create: `tests/e2e/package.json`
- Create: `tests/e2e/vitest.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create the e2e package manifest**

Create `tests/e2e/package.json`:

```json
{
  "name": "@elogx-test/e2e",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build:repo": "pnpm --dir ../.. build",
    "test": "pnpm run build:repo && vitest run",
    "test:cli": "pnpm run build:repo && vitest run src/cli-command.e2e.test.ts",
    "test:yuque-local": "pnpm run build:repo && ELOG_E2E_CASE=yuque-image-local-to-local vitest run src/sync-matrix.e2e.test.ts"
  },
  "dependencies": {
    "@elogx-test/elog": "workspace:*",
    "@elogx-test/plugin-from-yuque-token": "workspace:*",
    "@elogx-test/plugin-image-local": "workspace:*",
    "@elogx-test/plugin-to-local": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "~22.19.19",
    "typescript": "~6.0.3",
    "vitest": "^4.1.6"
  }
}
```

- [ ] **Step 2: Create the e2e Vitest config**

Create `tests/e2e/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.e2e.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    clearMocks: true,
    restoreMocks: true,
  },
});
```

- [ ] **Step 3: Add root manual scripts**

Modify the root `package.json` scripts block to include:

```json
{
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "e2e": "pnpm --filter @elogx-test/e2e test",
    "e2e:cli": "pnpm --filter @elogx-test/e2e test:cli",
    "e2e:yuque-local": "pnpm --filter @elogx-test/e2e test:yuque-local",
    "changeset": "changeset",
    "version": "changeset version",
    "publish": "changeset publish",
    "prepare": "husky"
  }
}
```

- [ ] **Step 4: Ignore local e2e workspaces**

Add this block near the existing local artifact ignores in `.gitignore`:

```gitignore
# E2E local workspaces
tests/e2e/.tmp/
```

- [ ] **Step 5: Install workspace lockfile updates**

Run:

```bash
pnpm install
```

Expected: pnpm recognizes `@elogx-test/e2e` as a workspace package and updates `pnpm-lock.yaml`.

- [ ] **Step 6: Verify the new package is discoverable**

Run:

```bash
pnpm --filter @elogx-test/e2e exec pwd
```

Expected output includes:

```text
/Users/1874w/@1874/elog-1.0/tests/e2e
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json pnpm-lock.yaml tests/e2e/package.json tests/e2e/vitest.config.ts
git commit -m "test: add e2e workspace"
```

---

### Task 2: Add Shared E2E Types

**Files:**
- Create: `tests/e2e/src/helpers/types.ts`

- [ ] **Step 1: Create shared type definitions**

Create `tests/e2e/src/helpers/types.ts`:

```ts
import type { Assertion } from 'vitest';

export interface CliResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  combinedOutput: string;
}

export interface TempWorkspace {
  path: string;
  cleanup: (force?: boolean) => void;
}

export interface CommandCaseContext {
  workspace: string;
  repoRoot: string;
}

export interface CommandCaseExpectContext extends CommandCaseContext {
  result: CliResult;
}

export interface CommandCase {
  id: string;
  command: string[];
  env?: NodeJS.ProcessEnv;
  setup?: (context: CommandCaseContext) => Promise<void> | void;
  expect: (context: CommandCaseExpectContext) => Promise<void> | void;
}

export interface SyncCaseExpected {
  cacheFile: string;
  outputDir: string;
  minMarkdownFiles: number;
  imageDir?: string;
  minImageFiles?: number;
}

export interface SyncCaseContext {
  workspace: string;
  repoRoot: string;
}

export interface SyncCaseAssertContext extends SyncCaseContext {
  firstRun: CliResult;
  secondRun: CliResult;
}

export interface SyncCase {
  id: string;
  title: string;
  requiredEnv: string[];
  configFile: string;
  expected: SyncCaseExpected;
  assert?: (context: SyncCaseAssertContext) => Promise<void> | void;
}

export type VitestExpect = <T = unknown>(actual: T, message?: string) => Assertion<T>;
```

- [ ] **Step 2: Typecheck the e2e package**

Run:

```bash
pnpm --filter @elogx-test/e2e exec tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 tests/e2e/src/helpers/types.ts
```

Expected: the command exits `0`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/src/helpers/types.ts
git commit -m "test: add e2e shared types"
```

---

### Task 3: Add The Real CLI Runner

**Files:**
- Create: `tests/e2e/src/helpers/run-cli.ts`
- Test: `tests/e2e/src/helpers/run-cli.test.ts`

- [ ] **Step 1: Write a focused test for the CLI runner**

Create `tests/e2e/src/helpers/run-cli.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { runNodeScript } from './run-cli';

describe('runNodeScript', () => {
  it('captures stdout, stderr, exit code, and combined output', async () => {
    const result = await runNodeScript(
      [
        '-e',
        "console.log('out-line'); console.error('err-line'); process.exitCode = 3;",
      ],
      {
        cwd: process.cwd(),
        env: {},
      },
    );

    expect(result.exitCode).toBe(3);
    expect(result.signal).toBeNull();
    expect(result.stdout).toContain('out-line');
    expect(result.stderr).toContain('err-line');
    expect(result.combinedOutput).toContain('out-line');
    expect(result.combinedOutput).toContain('err-line');
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers/run-cli.test.ts
```

Expected: FAIL because `tests/e2e/src/helpers/run-cli.ts` does not exist.

- [ ] **Step 3: Implement the CLI runner**

Create `tests/e2e/src/helpers/run-cli.ts`:

```ts
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { CliResult } from './types';

export interface RunCliOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  repoRoot?: string;
}

export function repoRootFromE2e(): string {
  return path.resolve(process.cwd(), '../..');
}

export function elogBinPath(repoRoot = repoRootFromE2e()): string {
  return path.join(repoRoot, 'packages/elog/bin/elog.js');
}

export function runNodeScript(args: string[], options: RunCliOptions): Promise<CliResult> {
  return runProcess(process.execPath, args, options);
}

export function runElog(args: string[], options: RunCliOptions): Promise<CliResult> {
  const repoRoot = options.repoRoot ?? repoRootFromE2e();
  return runProcess(process.execPath, [elogBinPath(repoRoot), ...args], {
    ...options,
    repoRoot,
  });
}

function runProcess(command: string, args: string[], options: RunCliOptions): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', reject);

    child.on('close', (exitCode, signal) => {
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        combinedOutput: `${stdout}${stderr}`,
      });
    });
  });
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers/run-cli.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/src/helpers/run-cli.ts tests/e2e/src/helpers/run-cli.test.ts
git commit -m "test: add e2e CLI runner"
```

---

### Task 4: Add Temporary Workspace Utilities

**Files:**
- Create: `tests/e2e/src/helpers/temp-workspace.ts`
- Test: `tests/e2e/src/helpers/temp-workspace.test.ts`

- [ ] **Step 1: Write tests for temporary workspace behavior**

Create `tests/e2e/src/helpers/temp-workspace.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyIntoWorkspace, createTempWorkspace } from './temp-workspace';

const createdPaths: string[] = [];

afterEach(() => {
  for (const item of createdPaths.splice(0)) {
    fs.rmSync(item, { recursive: true, force: true });
  }
});

describe('temp workspace helpers', () => {
  it('creates an isolated workspace and removes it on cleanup', () => {
    const workspace = createTempWorkspace('elog-e2e-test-');
    createdPaths.push(workspace.path);

    expect(fs.existsSync(workspace.path)).toBe(true);

    workspace.cleanup(true);

    expect(fs.existsSync(workspace.path)).toBe(false);
  });

  it('copies files and directories into the workspace', () => {
    const workspace = createTempWorkspace('elog-e2e-test-');
    const sourceRoot = path.join(workspace.path, 'source');
    createdPaths.push(workspace.path);

    fs.mkdirSync(path.join(sourceRoot, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'nested/file.txt'), 'hello', 'utf8');

    copyIntoWorkspace(sourceRoot, workspace.path, ['nested']);

    expect(fs.readFileSync(path.join(workspace.path, 'nested/file.txt'), 'utf8')).toBe('hello');
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers/temp-workspace.test.ts
```

Expected: FAIL because `tests/e2e/src/helpers/temp-workspace.ts` does not exist.

- [ ] **Step 3: Implement the temporary workspace helper**

Create `tests/e2e/src/helpers/temp-workspace.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import type { TempWorkspace } from './types';

export function createTempWorkspace(prefix = 'elog-e2e-'): TempWorkspace {
  const tmpRoot = path.join(path.resolve(process.cwd(), '../..'), 'tests/e2e/.tmp');
  fs.mkdirSync(tmpRoot, { recursive: true });

  const workspacePath = fs.mkdtempSync(path.join(tmpRoot, prefix));

  return {
    path: workspacePath,
    cleanup(remove = true) {
      if (remove && process.env.ELOG_E2E_KEEP_TMP !== '1') {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      } else {
        console.info(`Preserved e2e workspace: ${workspacePath}`);
      }
    },
  };
}

export function copyIntoWorkspace(sourceRoot: string, workspace: string, entries: string[]): void {
  for (const entry of entries) {
    const source = path.join(sourceRoot, entry);
    const destination = path.join(workspace, entry);
    fs.cpSync(source, destination, { recursive: true });
  }
}

export function copyFileIntoWorkspace(sourceFile: string, workspace: string, targetName?: string): void {
  const destination = path.join(workspace, targetName ?? path.basename(sourceFile));
  fs.cpSync(sourceFile, destination, { recursive: true });
}

export function preserveWorkspaceMessage(workspace: string): string {
  return `E2E workspace preserved at ${workspace}`;
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers/temp-workspace.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/src/helpers/temp-workspace.ts tests/e2e/src/helpers/temp-workspace.test.ts
git commit -m "test: add e2e temp workspace helpers"
```

---

### Task 5: Add Shared Assertions

**Files:**
- Create: `tests/e2e/src/helpers/assertions.ts`
- Test: `tests/e2e/src/helpers/assertions.test.ts`

- [ ] **Step 1: Write tests for assertion helpers**

Create `tests/e2e/src/helpers/assertions.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  countFilesByExtension,
  readJsonFile,
  requireDirectory,
  requireFile,
} from './assertions';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('assertion helpers', () => {
  it('checks files, directories, JSON, and extension counts', () => {
    const tmpRoot = path.join(process.cwd(), '.tmp');
    fs.mkdirSync(tmpRoot, { recursive: true });
    const root = fs.mkdtempSync(path.join(tmpRoot, 'elog-e2e-assertions-'));
    tempRoots.push(root);

    fs.mkdirSync(path.join(root, 'docs'));
    fs.writeFileSync(path.join(root, 'docs/a.md'), '# A', 'utf8');
    fs.writeFileSync(path.join(root, 'docs/b.txt'), 'B', 'utf8');
    fs.writeFileSync(path.join(root, 'cache.json'), '{"sortedDocList":[]}', 'utf8');

    expect(requireDirectory(path.join(root, 'docs'))).toBe(path.join(root, 'docs'));
    expect(requireFile(path.join(root, 'cache.json'))).toBe(path.join(root, 'cache.json'));
    expect(readJsonFile(path.join(root, 'cache.json'))).toEqual({ sortedDocList: [] });
    expect(countFilesByExtension(path.join(root, 'docs'), '.md')).toBe(1);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers/assertions.test.ts
```

Expected: FAIL because `tests/e2e/src/helpers/assertions.ts` does not exist.

- [ ] **Step 3: Implement assertion helpers**

Create `tests/e2e/src/helpers/assertions.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import type { CliResult, SyncCaseExpected } from './types';

export function expectExitCode(result: CliResult, exitCode: number): void {
  expect(result.exitCode).toBe(exitCode);
  expect(result.signal).toBeNull();
}

export function expectOutputContains(result: CliResult, text: string): void {
  expect(result.combinedOutput).toContain(text);
}

export function requireFile(filePath: string): string {
  expect(fs.existsSync(filePath), `${filePath} should exist`).toBe(true);
  expect(fs.statSync(filePath).isFile(), `${filePath} should be a file`).toBe(true);
  return filePath;
}

export function requireDirectory(directoryPath: string): string {
  expect(fs.existsSync(directoryPath), `${directoryPath} should exist`).toBe(true);
  expect(
    fs.statSync(directoryPath).isDirectory(),
    `${directoryPath} should be a directory`,
  ).toBe(true);
  return directoryPath;
}

export function readJsonFile(filePath: string): unknown {
  requireFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function countFilesByExtension(directoryPath: string, extension: string): number {
  requireDirectory(directoryPath);

  let count = 0;
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      count += countFilesByExtension(entryPath, extension);
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      count += 1;
    }
  }

  return count;
}

export function countFiles(directoryPath: string): number {
  requireDirectory(directoryPath);

  let count = 0;
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(entryPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

export function expectSyncArtifacts(workspace: string, expected: SyncCaseExpected): void {
  const outputDir = path.join(workspace, expected.outputDir);
  const cachePath = path.join(workspace, expected.cacheFile);
  const cache = readJsonFile(cachePath);

  requireDirectory(outputDir);
  expect(countFilesByExtension(outputDir, '.md')).toBeGreaterThanOrEqual(
    expected.minMarkdownFiles,
  );
  expect(cache).toHaveProperty('sortedDocList');

  if (expected.imageDir) {
    const imageDir = path.join(workspace, expected.imageDir);
    requireDirectory(imageDir);
    expect(countFiles(imageDir)).toBeGreaterThanOrEqual(expected.minImageFiles ?? 0);
  }
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers/assertions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/src/helpers/assertions.ts tests/e2e/src/helpers/assertions.test.ts
git commit -m "test: add e2e assertion helpers"
```

---

### Task 6: Add Case Loaders

**Files:**
- Create: `tests/e2e/src/helpers/command-case-loader.ts`
- Create: `tests/e2e/src/helpers/case-loader.ts`
- Test: `tests/e2e/src/helpers/case-loader.test.ts`

- [ ] **Step 1: Write loader tests**

Create `tests/e2e/src/helpers/case-loader.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filterSyncCases } from './case-loader';
import type { SyncCase } from './types';

const cases: SyncCase[] = [
  {
    id: 'one',
    title: 'One',
    requiredEnv: [],
    configFile: 'elog.config.ts',
    expected: {
      cacheFile: 'elog.cache.json',
      outputDir: 'docs',
      minMarkdownFiles: 1,
    },
  },
  {
    id: 'two',
    title: 'Two',
    requiredEnv: [],
    configFile: 'elog.config.ts',
    expected: {
      cacheFile: 'elog.cache.json',
      outputDir: 'docs',
      minMarkdownFiles: 1,
    },
  },
];

describe('filterSyncCases', () => {
  it('returns all cases when no filter is provided', () => {
    expect(filterSyncCases(cases, undefined).map((testCase) => testCase.id)).toEqual([
      'one',
      'two',
    ]);
  });

  it('returns only the matching case when a filter is provided', () => {
    expect(filterSyncCases(cases, 'two').map((testCase) => testCase.id)).toEqual(['two']);
  });

  it('throws a readable error for an unknown filter', () => {
    expect(() => filterSyncCases(cases, 'missing')).toThrow(
      'No e2e sync case matched ELOG_E2E_CASE=missing',
    );
  });
});
```

- [ ] **Step 2: Run the focused loader test and verify it fails**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers/case-loader.test.ts
```

Expected: FAIL because `tests/e2e/src/helpers/case-loader.ts` does not exist.

- [ ] **Step 3: Implement the command case loader**

Create `tests/e2e/src/helpers/command-case-loader.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import type { CommandCase } from './types';

export async function loadCommandCases(repoRoot: string): Promise<CommandCase[]> {
  const casesDir = path.join(repoRoot, 'tests/e2e/command-cases');
  const caseFiles = fs
    .readdirSync(casesDir)
    .filter((file) => file.endsWith('.case.ts'))
    .sort();

  const cases: CommandCase[] = [];

  for (const file of caseFiles) {
    const modulePath = path.join(casesDir, file);
    const loaded = (await import(pathToFileUrl(modulePath))) as { default: CommandCase };
    cases.push(loaded.default);
  }

  return cases;
}

function pathToFileUrl(filePath: string): string {
  return new URL(`file://${filePath}`).href;
}
```

- [ ] **Step 4: Implement the sync case loader**

Create `tests/e2e/src/helpers/case-loader.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import type { SyncCase } from './types';

export async function loadSyncCases(repoRoot: string): Promise<SyncCase[]> {
  const casesDir = path.join(repoRoot, 'tests/e2e/cases');
  const caseDirs = fs
    .readdirSync(casesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const cases: SyncCase[] = [];

  for (const dir of caseDirs) {
    const modulePath = path.join(casesDir, dir, 'case.ts');
    const loaded = (await import(pathToFileUrl(modulePath))) as { default: SyncCase };
    cases.push(loaded.default);
  }

  return cases;
}

export function filterSyncCases(cases: SyncCase[], selectedCase?: string): SyncCase[] {
  if (!selectedCase) {
    return cases;
  }

  const filtered = cases.filter((testCase) => testCase.id === selectedCase);

  if (filtered.length === 0) {
    throw new Error(`No e2e sync case matched ELOG_E2E_CASE=${selectedCase}`);
  }

  return filtered;
}

function pathToFileUrl(filePath: string): string {
  return new URL(`file://${filePath}`).href;
}
```

- [ ] **Step 5: Run the loader tests and verify they pass**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers/case-loader.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/src/helpers/command-case-loader.ts tests/e2e/src/helpers/case-loader.ts tests/e2e/src/helpers/case-loader.test.ts
git commit -m "test: add e2e case loaders"
```

---

### Task 7: Add The Generic Command E2E Runner

**Files:**
- Create: `tests/e2e/src/cli-command.e2e.test.ts`

- [ ] **Step 1: Create the command e2e runner**

Create `tests/e2e/src/cli-command.e2e.test.ts`:

```ts
import { describe, it } from 'vitest';
import { loadCommandCases } from './helpers/command-case-loader';
import { repoRootFromE2e, runElog } from './helpers/run-cli';
import { createTempWorkspace, preserveWorkspaceMessage } from './helpers/temp-workspace';

const repoRoot = repoRootFromE2e();
const commandCases = await loadCommandCases(repoRoot);

describe('elog command e2e', () => {
  for (const commandCase of commandCases) {
    it(commandCase.id, async () => {
      const workspace = createTempWorkspace(`elog-e2e-${commandCase.id}-`);
      let passed = false;

      try {
        await commandCase.setup?.({
          workspace: workspace.path,
          repoRoot,
        });

        const result = await runElog(commandCase.command, {
          cwd: workspace.path,
          repoRoot,
          env: commandCase.env,
        });

        await commandCase.expect({
          result,
          workspace: workspace.path,
          repoRoot,
        });

        passed = true;
      } finally {
        if (!passed) {
          console.info(preserveWorkspaceMessage(workspace.path));
        }
        workspace.cleanup(passed);
      }
    });
  }
});
```

- [ ] **Step 2: Run the command e2e runner and verify it fails before cases exist**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/cli-command.e2e.test.ts
```

Expected: FAIL because `tests/e2e/command-cases` does not exist.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/src/cli-command.e2e.test.ts
git commit -m "test: add command e2e runner"
```

---

### Task 8: Add Initial Command Cases

**Files:**
- Create: `tests/e2e/command-cases/version.case.ts`
- Create: `tests/e2e/command-cases/init-dry-run.case.ts`
- Create: `tests/e2e/command-cases/sync-missing-config.case.ts`
- Create: `tests/e2e/command-cases/sync-offline-fixture.case.ts`

- [ ] **Step 1: Add the version command case**

Create `tests/e2e/command-cases/version.case.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode } from '../src/helpers/assertions';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'version',
  command: ['--version'],
  expect({ result, repoRoot }) {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'packages/elog/package.json'), 'utf8'),
    ) as { version: string };

    expectExitCode(result, 0);
    expect(result.stdout.trim()).toBe(packageJson.version);
  },
};

export default commandCase;
```

- [ ] **Step 2: Add the init dry-run command case**

Create `tests/e2e/command-cases/init-dry-run.case.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode, expectOutputContains } from '../src/helpers/assertions';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'init-dry-run',
  command: ['init', '--dry-run', '--name', 'elog.config.ts'],
  expect({ result, workspace }) {
    expectExitCode(result, 0);
    expectOutputContains(result, 'elog.config.ts');
    expect(fs.existsSync(path.join(workspace, 'elog.config.ts'))).toBe(false);
  },
};

export default commandCase;
```

- [ ] **Step 3: Add the missing config sync command case**

Create `tests/e2e/command-cases/sync-missing-config.case.ts`:

```ts
import { expect } from 'vitest';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'sync-missing-config',
  command: ['sync', '--config', 'missing.config.ts'],
  expect({ result }) {
    expect(result.exitCode).toBe(1);
    expect(result.signal).toBeNull();
    expect(result.combinedOutput.length).toBeGreaterThan(0);
  },
};

export default commandCase;
```

- [ ] **Step 4: Add the offline fixture sync command case**

Create `tests/e2e/command-cases/sync-offline-fixture.case.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { expectExitCode, expectOutputContains, requireFile } from '../src/helpers/assertions';
import { copyIntoWorkspace } from '../src/helpers/temp-workspace';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'sync-offline-fixture',
  command: ['sync', '--config', 'elog.config.ts'],
  setup({ workspace, repoRoot }) {
    copyIntoWorkspace(path.join(repoRoot, 'tests/fixtures/basic-config'), workspace, [
      'elog.config.ts',
      'plugins.ts',
    ]);
  },
  expect({ result, workspace }) {
    expectExitCode(result, 0);
    expectOutputContains(result, '同步结果');
    requireFile(path.join(workspace, 'fixture.cache.json'));
    requireFile(path.join(workspace, 'fixture.output.txt'));

    const output = fs.readFileSync(path.join(workspace, 'fixture.output.txt'), 'utf8');
    expectOutputContains(
      {
        exitCode: 0,
        signal: null,
        stdout: output,
        stderr: '',
        combinedOutput: output,
      },
      'fixture-transformed',
    );
  },
};

export default commandCase;
```

- [ ] **Step 5: Run command e2e through the direct Vitest command**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/cli-command.e2e.test.ts
```

Expected: PASS if `packages/elog/dist/index.js` already exists. If it fails because `dist/index.js` is missing, run the next step through the package script.

- [ ] **Step 6: Run command e2e through the package script**

Run:

```bash
pnpm e2e:cli
```

Expected: PASS. The script builds the repo first and then runs all command cases.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/command-cases
git commit -m "test: add initial command e2e cases"
```

---

### Task 9: Add The Generic Sync Matrix Runner

**Files:**
- Create: `tests/e2e/src/sync-matrix.e2e.test.ts`

- [ ] **Step 1: Create the sync matrix e2e runner**

Create `tests/e2e/src/sync-matrix.e2e.test.ts`:

```ts
import path from 'node:path';
import { describe, it } from 'vitest';
import { expectExitCode, expectOutputContains, expectSyncArtifacts } from './helpers/assertions';
import { filterSyncCases, loadSyncCases } from './helpers/case-loader';
import { repoRootFromE2e, runElog } from './helpers/run-cli';
import {
  copyIntoWorkspace,
  createTempWorkspace,
  preserveWorkspaceMessage,
} from './helpers/temp-workspace';

const repoRoot = repoRootFromE2e();
const loadedCases = await loadSyncCases(repoRoot);
const syncCases = filterSyncCases(loadedCases, process.env.ELOG_E2E_CASE);

describe('elog sync e2e matrix', () => {
  for (const syncCase of syncCases) {
    const missingEnv = syncCase.requiredEnv.filter((name) => !process.env[name]);
    const runCase = missingEnv.length === 0 ? it : it.skip;

    runCase(syncCase.title, async () => {
      const workspace = createTempWorkspace(`elog-e2e-${syncCase.id}-`);
      let passed = false;

      try {
        const caseRoot = path.join(repoRoot, 'tests/e2e/cases', syncCase.id);
        copyIntoWorkspace(caseRoot, workspace.path, [syncCase.configFile]);

        const firstRun = await runElog(['sync', '--config', syncCase.configFile], {
          cwd: workspace.path,
          repoRoot,
        });

        expectExitCode(firstRun, 0);
        expectOutputContains(firstRun, '同步结果');
        expectSyncArtifacts(workspace.path, syncCase.expected);

        const secondRun = await runElog(['sync', '--config', syncCase.configFile], {
          cwd: workspace.path,
          repoRoot,
        });

        expectExitCode(secondRun, 0);
        expectOutputContains(secondRun, '同步结果');
        expectSyncArtifacts(workspace.path, syncCase.expected);

        await syncCase.assert?.({
          firstRun,
          secondRun,
          workspace: workspace.path,
          repoRoot,
        });

        passed = true;
      } finally {
        if (!passed) {
          console.info(preserveWorkspaceMessage(workspace.path));
          if (missingEnv.length > 0) {
            console.info(`Missing env for ${syncCase.id}: ${missingEnv.join(', ')}`);
          }
        }
        workspace.cleanup(passed);
      }
    });
  }
});
```

- [ ] **Step 2: Run the sync runner and verify it fails before cases exist**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/sync-matrix.e2e.test.ts
```

Expected: FAIL because `tests/e2e/cases` does not exist.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/src/sync-matrix.e2e.test.ts
git commit -m "test: add sync e2e matrix runner"
```

---

### Task 10: Add The Yuque Image-Local To Local Sync Case

**Files:**
- Create: `tests/e2e/cases/yuque-image-local-to-local/case.ts`
- Create: `tests/e2e/cases/yuque-image-local-to-local/elog.config.ts`
- Create: `tests/e2e/cases/yuque-image-local-to-local/README.md`

- [ ] **Step 1: Add the sync case metadata**

Create `tests/e2e/cases/yuque-image-local-to-local/case.ts`:

```ts
import { expect } from 'vitest';
import type { SyncCase } from '../../src/helpers/types';

const syncCase: SyncCase = {
  id: 'yuque-image-local-to-local',
  title: 'Yuque token source -> local images -> local deploy',
  requiredEnv: [
    'ELOG_E2E_YUQUE_TOKEN',
    'ELOG_E2E_YUQUE_LOGIN',
    'ELOG_E2E_YUQUE_REPO',
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: 'elog.cache.json',
    outputDir: 'docs',
    minMarkdownFiles: 1,
    imageDir: 'images',
    minImageFiles: 1,
  },
  assert({ secondRun }) {
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
```

- [ ] **Step 2: Add the real Yuque local config**

Create `tests/e2e/cases/yuque-image-local-to-local/elog.config.ts`:

```ts
import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-token';
import imageLocal from '@elogx-test/plugin-image-local';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  id: 'yuque-image-local-to-local',
  cacheFilePath: 'elog.cache.json',
  from: fromYuque({
    token: process.env.ELOG_E2E_YUQUE_TOKEN,
    login: process.env.ELOG_E2E_YUQUE_LOGIN,
    repo: process.env.ELOG_E2E_YUQUE_REPO,
    onlyPublic: false,
  }),
  plugins: [
    imageLocal({
      outputDir: './images',
      prefixKey: '../images',
    }),
  ],
  to: toLocal({
    outputDir: './docs',
    keepToc: true,
    filename: 'title',
    frontMatter: { enable: true },
  }),
});
```

- [ ] **Step 3: Add the human setup README**

Create `tests/e2e/cases/yuque-image-local-to-local/README.md`:

```md
# Yuque Image Local To Local E2E Case

This case runs the real Elog CLI against a real Yuque repository, downloads
images to a local `images/` directory, and deploys markdown files to `docs/`.

Required environment variables:

```bash
export ELOG_E2E_YUQUE_TOKEN=""
export ELOG_E2E_YUQUE_LOGIN=""
export ELOG_E2E_YUQUE_REPO=""
```

The Yuque repository used by this case must contain:

- At least one stable published document.
- At least one stable image in document content.

Run:

```bash
pnpm e2e:yuque-local
```

Set `ELOG_E2E_KEEP_TMP=1` to preserve generated temporary workspaces for
inspection.
```

- [ ] **Step 4: Run the sync e2e without credentials and verify skip behavior**

Run:

```bash
env -u ELOG_E2E_YUQUE_TOKEN -u ELOG_E2E_YUQUE_LOGIN -u ELOG_E2E_YUQUE_REPO pnpm e2e:yuque-local
```

Expected: the sync case is skipped because required env is missing. The command exits `0`.

- [ ] **Step 5: Run the sync e2e with credentials**

Run:

```bash
ELOG_E2E_YUQUE_TOKEN="$ELOG_E2E_YUQUE_TOKEN" \
ELOG_E2E_YUQUE_LOGIN="$ELOG_E2E_YUQUE_LOGIN" \
ELOG_E2E_YUQUE_REPO="$ELOG_E2E_YUQUE_REPO" \
pnpm e2e:yuque-local
```

Expected: PASS, with markdown files in `docs/`, image files in `images/`, and `elog.cache.json` in the temporary workspace.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/cases/yuque-image-local-to-local
git commit -m "test: add yuque local sync e2e case"
```

---

### Task 11: Verify Script Behavior End To End

**Files:**
- Modify only if verification reveals a concrete issue in files created by earlier tasks.

- [ ] **Step 1: Run helper tests**

Run:

```bash
pnpm --filter @elogx-test/e2e exec vitest run src/helpers
```

Expected: PASS for helper unit tests.

- [ ] **Step 2: Run command e2e from the root script**

Run:

```bash
pnpm e2e:cli
```

Expected: PASS for `version`, `init-dry-run`, `sync-missing-config`, and `sync-offline-fixture`.

- [ ] **Step 3: Run sync e2e skip path from the root script**

Run:

```bash
env -u ELOG_E2E_YUQUE_TOKEN -u ELOG_E2E_YUQUE_LOGIN -u ELOG_E2E_YUQUE_REPO pnpm e2e:yuque-local
```

Expected: PASS with the Yuque sync case skipped.

- [ ] **Step 4: Run sync e2e real path when credentials are available**

Run:

```bash
pnpm e2e:yuque-local
```

Expected when credentials are available: PASS with two successful `elog sync` executions.

Expected when credentials are missing: PASS with the Yuque sync case skipped.

- [ ] **Step 5: Run repository tests**

Run:

```bash
pnpm test
```

Expected: PASS. The new real-platform e2e tests are not part of the default unit test path.

- [ ] **Step 6: Commit final adjustments**

If Step 1 through Step 5 required fixes, commit them:

```bash
git add package.json pnpm-lock.yaml tests/e2e
git commit -m "test: verify e2e scripts"
```

If no files changed after verification, skip this commit.

---

## Self-Review Checklist

- Spec coverage: This plan creates a dedicated `tests/e2e` workspace, command registry, sync case registry, real CLI runner, temp workspace helper, command cases, Yuque sync case, root scripts, and manual verification commands.
- Placeholder scan: The plan contains concrete paths, code snippets, commands, and expected results.
- Type consistency: `CommandCase`, `SyncCase`, `CliResult`, and helper function names are defined before they are used by runners and cases.
- Scope check: The plan does not include CI workflow changes, remote target plugin cleanup, or migration of `tests/test-elog`.
