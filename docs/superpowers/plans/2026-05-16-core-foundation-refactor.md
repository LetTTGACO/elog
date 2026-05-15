# Core Foundation Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Elog's pre-release 1.0 core so runtime execution, config resolution, plugin contracts, and tests are stable before adding new commands and Elog 0.x compatibility.

**Architecture:** Introduce explicit runtime/config/plugin boundaries inside `packages/elog/src` without splitting npm packages yet. The runtime consumes normalized `RuntimeWorkflowConfig[]`, executes workflows through `WorkflowRunner -> Graph -> PluginDriver`, returns structured `WorkflowResult` values, and leaves process exits to the CLI. Plugins become discriminated by `kind` and receive an explicit `ctx` parameter instead of relying on hook `this`.

**Tech Stack:** TypeScript, pnpm workspaces, Turborepo, tsdown, Vitest, Commander, JoyCon, bundle-require.

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `package.json` | Modify | Add root test script that delegates to Turbo |
| `turbo.json` | Modify | Add test task outputs |
| `packages/elog/package.json` | Modify | Add `test` script and Vitest dev dependency |
| `packages/elog/vitest.config.ts` | Create | Vitest configuration for core package |
| `packages/elog/src/plugins/types.ts` | Create | New explicit plugin contract |
| `packages/elog/src/plugins/context.ts` | Create | New grouped `PluginContext` factory |
| `packages/elog/src/plugins/errors.ts` | Create | `ElogError` and `ElogPluginError` |
| `packages/elog/src/runtime/types.ts` | Create | Runtime workflow/result types |
| `packages/elog/src/runtime/PluginDriver.ts` | Create | Elog lifecycle hook runner |
| `packages/elog/src/runtime/Graph.ts` | Create | Single-workflow orchestrator |
| `packages/elog/src/runtime/WorkflowRunner.ts` | Create | Multi-workflow runner |
| `packages/elog/src/cache/CacheStore.ts` | Create | Cache load/update/write service |
| `packages/elog/src/config/load.ts` | Create | Raw config file loading |
| `packages/elog/src/config/resolve.ts` | Create | Adapter orchestration |
| `packages/elog/src/config/normalize.ts` | Create | Runtime config defaulting |
| `packages/elog/src/config/validate.ts` | Create | Config diagnostics |
| `packages/elog/src/config/adapters/v1.ts` | Create | Current 1.0 config adapter |
| `packages/elog/src/config/adapters/legacy-v0.ts` | Create | Elog 0.x public config detector |
| `packages/elog/src/doc/filter.ts` | Create | Move incremental filtering out of `utils/doc/form.ts` |
| `packages/elog/src/doc/image.ts` | Create | Move shared image replacement helper |
| `packages/elog/src/node-entry.ts` | Modify | Return `Promise<WorkflowResult[]>` |
| `packages/elog/src/commands/sync.ts` | Modify | Resolve config and print runtime results |
| `packages/elog/src/index.ts` | Modify | Export new runtime/plugin/config APIs |
| `packages/elog/src/utils/elog.ts` | Modify | Keep `defineConfig()` as identity helper for raw config |
| `packages/elog/src/utils/PluginDriver.ts` | Delete or replace | Old hook runner superseded by `runtime/PluginDriver.ts` |
| `packages/elog/src/Graph.ts` | Delete or replace | Old graph superseded by `runtime/Graph.ts` |
| `packages/elog/src/utils/PluginContext.ts` | Delete or replace | Old flat context superseded by `plugins/context.ts` |
| `packages/elog/src/utils/doc/form.ts` | Modify | Re-export new doc helpers for temporary import compatibility |
| `packages/elog/src/utils/doc/image.ts` | Modify | Re-export new image helpers for temporary import compatibility |
| `packages/elog/src/**/*.test.ts` | Create | Core unit tests |
| `playground/plugin-*/src/index.ts` | Modify | Add `kind`, namespace names, and explicit `ctx` parameter |
| `playground/plugin-*/src/*Client.ts` | Modify | Replace old flat context property reads with grouped context reads |
| `playground/plugin-*/src/*Api.ts` | Modify | Replace old flat context property reads with grouped context reads |
| `playground/plugin-to-*/src/*Deploy.ts` | Modify | Replace old flat context property reads and no-op exits |
| `tests/fixtures/` | Create | Fixture config and mock plugin helpers for CLI smoke tests |

## Task 1: Add Vitest Test Harness

**Files:**
- Modify: `package.json`
- Modify: `turbo.json`
- Modify: `packages/elog/package.json`
- Create: `packages/elog/vitest.config.ts`

- [ ] **Step 1: Add the failing test script expectation**

Run:

```bash
pnpm --filter @elogx-test/elog test
```

Expected: fails because `test` is not defined in `packages/elog/package.json`.

- [ ] **Step 2: Install Vitest in the core package**

Run:

```bash
pnpm --filter @elogx-test/elog add -D vitest
```

Expected: `vitest` appears under `packages/elog/package.json` `devDependencies`, and `pnpm-lock.yaml` changes.

- [ ] **Step 3: Add test scripts**

Modify root `package.json` scripts to include:

```json
{
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "changeset": "changeset",
    "version": "changeset version",
    "publish": "changeset publish",
    "prepare": "husky"
  }
}
```

Modify `packages/elog/package.json` scripts to include:

```json
{
  "scripts": {
    "build": "tsdown",
    "test": "vitest run --passWithNoTests"
  }
}
```

- [ ] **Step 4: Add Turbo test task**

Modify `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

- [ ] **Step 5: Create Vitest config**

Create `packages/elog/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

- [ ] **Step 6: Run empty test suite**

Run:

```bash
pnpm --filter @elogx-test/elog test
```

Expected: PASS with no tests found because `--passWithNoTests` is enabled.

- [ ] **Step 7: Commit**

```bash
git add package.json turbo.json packages/elog/package.json packages/elog/vitest.config.ts pnpm-lock.yaml
git commit -m "test: add vitest harness for core package"
```

## Task 2: Define Runtime, Plugin, and Error Types

**Files:**
- Create: `packages/elog/src/plugins/types.ts`
- Create: `packages/elog/src/plugins/errors.ts`
- Create: `packages/elog/src/plugins/context.ts`
- Create: `packages/elog/src/runtime/types.ts`
- Modify: `packages/elog/src/index.ts`
- Test: `packages/elog/src/plugins/types.test.ts`

- [ ] **Step 1: Write type-shape tests**

Create `packages/elog/src/plugins/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ElogPluginError } from './errors';
import type { ElogPlugin, PluginContext } from './types';

describe('plugin contract', () => {
  it('uses explicit plugin kind values', () => {
    const pluginKinds: ElogPlugin['kind'][] = ['from', 'transform', 'to'];
    expect(pluginKinds).toEqual(['from', 'transform', 'to']);
  });

  it('wraps plugin errors with hook metadata', () => {
    const cause = new Error('network failed');
    const error = new ElogPluginError('from:notion', 'download', cause);

    expect(error.name).toBe('ElogPluginError');
    expect(error.pluginName).toBe('from:notion');
    expect(error.hookName).toBe('download');
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('from:notion');
    expect(error.message).toContain('download');
  });

  it('describes grouped plugin context capabilities', () => {
    const contextKeys: Array<keyof PluginContext> = [
      'workflow',
      'logger',
      'http',
      'cache',
      'image',
    ];

    expect(contextKeys).toEqual(['workflow', 'logger', 'http', 'cache', 'image']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/plugins/types.test.ts
```

Expected: FAIL because `./errors` and `./types` do not exist.

- [ ] **Step 3: Create plugin error classes**

Create `packages/elog/src/plugins/errors.ts`:

```ts
export type ElogHookName = 'download' | 'transform' | 'deploy';

export class ElogError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ElogError';
    this.cause = cause;
  }
}

export class ElogPluginError extends ElogError {
  readonly pluginName: string;
  readonly hookName: ElogHookName;

  constructor(pluginName: string, hookName: ElogHookName, cause?: unknown) {
    const message = `Plugin "${pluginName}" failed during "${hookName}" hook`;
    super(message, cause);
    this.name = 'ElogPluginError';
    this.pluginName = pluginName;
    this.hookName = hookName;
  }
}

export class ElogConfigError extends ElogError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ElogConfigError';
  }
}
```

- [ ] **Step 4: Create explicit plugin types**

Create `packages/elog/src/plugins/types.ts`:

```ts
import type request from '../utils/request';
import type { DocDetail, SortedDoc } from '../types/doc';
import type { LoggingFunction } from '../types/log';
import type {
  cleanUrlParam,
  genUniqueIdFromUrl,
  getBaseUrl,
  getBufferFromUrl,
  getFileType,
  getFileTypeFromBuffer,
  getFileTypeFromUrl,
  getUrlListFromContent,
} from '../utils/image';

export interface WorkflowInfo {
  id: string;
  cacheFilePath: string;
}

export interface Logger {
  debug: LoggingFunction;
  success: LoggingFunction;
  error: (head: string) => never;
  info: LoggingFunction;
  warn: LoggingFunction;
}

export interface CacheReadonlyContext {
  docList: DocDetail[];
}

export interface ImageUtils {
  genUniqueIdFromUrl: typeof genUniqueIdFromUrl;
  getFileTypeFromUrl: typeof getFileTypeFromUrl;
  getFileTypeFromBuffer: typeof getFileTypeFromBuffer;
  cleanUrlParam: typeof cleanUrlParam;
  getUrlListFromContent: typeof getUrlListFromContent;
  getBaseUrl: typeof getBaseUrl;
  getFileType: typeof getFileType;
  getBufferFromUrl: typeof getBufferFromUrl;
}

export interface PluginContext {
  workflow: WorkflowInfo;
  logger: Logger;
  http: typeof request;
  cache: CacheReadonlyContext;
  image: ImageUtils;
}

export interface DownloadResult {
  docDetailList: DocDetail[];
  sortedDocList?: SortedDoc<unknown>[];
  docStatusMap: Record<string, { _updateIndex: number; _status: number }>;
}

export interface DeployResult {
  deployedCount?: number;
}

export interface BasePlugin {
  name: string;
  version?: string;
}

export interface FromPlugin extends BasePlugin {
  kind: 'from';
  download(ctx: PluginContext): Promise<DownloadResult>;
}

export interface TransformPlugin extends BasePlugin {
  kind: 'transform';
  transform(docs: DocDetail[], ctx: PluginContext): Promise<DocDetail[]>;
}

export interface ToPlugin extends BasePlugin {
  kind: 'to';
  deploy(docs: DocDetail[], ctx: PluginContext): Promise<DeployResult | void> | DeployResult | void;
}

export type ElogPlugin = FromPlugin | TransformPlugin | ToPlugin;
```

- [ ] **Step 5: Create plugin context factory**

Create `packages/elog/src/plugins/context.ts`:

```ts
import type { DocDetail } from '../types/doc';
import out from '../utils/logger';
import request from '../utils/request';
import {
  cleanUrlParam,
  genUniqueIdFromUrl,
  getBaseUrl,
  getBufferFromUrl,
  getFileType,
  getFileTypeFromBuffer,
  getFileTypeFromUrl,
  getUrlListFromContent,
} from '../utils/image';
import type { PluginContext, WorkflowInfo } from './types';

export function createPluginContext(options: {
  workflow: WorkflowInfo;
  cachedDocList: DocDetail[];
}): PluginContext {
  return {
    workflow: options.workflow,
    logger: {
      debug: out.debug,
      success: out.success,
      error: out.error,
      info: out.info,
      warn: out.warn,
    },
    http: request,
    cache: {
      docList: options.cachedDocList,
    },
    image: {
      genUniqueIdFromUrl,
      getFileTypeFromUrl,
      getFileTypeFromBuffer,
      cleanUrlParam,
      getUrlListFromContent,
      getBaseUrl,
      getFileType,
      getBufferFromUrl,
    },
  };
}
```

- [ ] **Step 6: Create runtime types**

Create `packages/elog/src/runtime/types.ts`:

```ts
import type { SortedDoc } from '../types/doc';
import type { ElogError } from '../plugins/errors';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';

export interface CacheConfig {
  disabled: boolean;
  filePath: string;
}

export interface RuntimeWorkflowConfig {
  id: string;
  disabled: boolean;
  cache: CacheConfig;
  from: FromPlugin;
  transforms: TransformPlugin[];
  to: ToPlugin[];
  deployStrategy: 'serial' | 'parallel';
}

export type WorkflowResult =
  | {
      status: 'success';
      workflowId: string;
      syncedCount: number;
      cacheFilePath: string;
      sortedDocList: SortedDoc<unknown>[];
    }
  | {
      status: 'skipped';
      workflowId: string;
      reason: 'disabled' | 'no-changes';
    }
  | {
      status: 'failed';
      workflowId: string;
      error: ElogError;
    };
```

- [ ] **Step 7: Export new APIs**

Modify `packages/elog/src/index.ts` to export these modules:

```ts
export * from './plugins/types';
export * from './plugins/errors';
export * from './plugins/context';
export * from './runtime/types';
```

Keep the existing exports in `index.ts` for now; remove old compatibility exports only after in-repo plugins are migrated.

- [ ] **Step 8: Run test**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/plugins/types.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/elog/src/plugins packages/elog/src/runtime/types.ts packages/elog/src/index.ts
git commit -m "feat: define explicit plugin and runtime contracts"
```

## Task 3: Add Config Pipeline

**Files:**
- Create: `packages/elog/src/config/load.ts`
- Create: `packages/elog/src/config/resolve.ts`
- Create: `packages/elog/src/config/normalize.ts`
- Create: `packages/elog/src/config/validate.ts`
- Create: `packages/elog/src/config/adapters/v1.ts`
- Create: `packages/elog/src/config/adapters/legacy-v0.ts`
- Modify: `packages/elog/src/types/common.ts`
- Modify: `packages/elog/src/utils/elog.ts`
- Test: `packages/elog/src/config/resolve.test.ts`

- [ ] **Step 1: Write config resolver tests**

Create `packages/elog/src/config/resolve.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';

const fromPlugin: FromPlugin = {
  name: 'from:mock',
  kind: 'from',
  async download() {
    return { docDetailList: [], sortedDocList: [], docStatusMap: {} };
  },
};

const transformPlugin: TransformPlugin = {
  name: 'transform:mock',
  kind: 'transform',
  async transform(docs) {
    return docs;
  },
};

const toPlugin: ToPlugin = {
  name: 'to:mock',
  kind: 'to',
  deploy() {},
};

describe('resolveConfig', () => {
  it('normalizes a single v1 workflow', () => {
    const result = resolveConfig({
      from: fromPlugin,
      plugins: [transformPlugin],
      to: toPlugin,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.workflows).toHaveLength(1);
    expect(result.workflows[0]).toMatchObject({
      id: 'workflow-1',
      disabled: false,
      cache: { disabled: false, filePath: 'elog.cache.json' },
      from: fromPlugin,
      transforms: [transformPlugin],
      to: [toPlugin],
      deployStrategy: 'serial',
    });
  });

  it('normalizes multi-workflow cache defaults', () => {
    const result = resolveConfig([
      { from: fromPlugin, to: toPlugin },
      { from: fromPlugin, to: [toPlugin] },
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.workflows.map((workflow) => workflow.cache.filePath)).toEqual([
      'elog.cache1.json',
      'elog.cache2.json',
    ]);
  });

  it('reports missing from plugin', () => {
    const result = resolveConfig({ to: toPlugin });

    expect(result.workflows).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      level: 'error',
      code: 'CONFIG_MISSING_FROM',
    });
  });

  it('detects likely Elog 0.x config', () => {
    const result = resolveConfig({
      write: { platform: 'yuque' },
      deploy: { platform: 'local' },
      image: { enable: true },
    });

    expect(result.workflows).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      level: 'error',
      code: 'LEGACY_V0_CONFIG_DETECTED',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/config/resolve.test.ts
```

Expected: FAIL because `resolveConfig` does not exist.

- [ ] **Step 3: Update config types**

Modify `packages/elog/src/types/common.ts`:

```ts
import type { ElogPlugin, FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';

export type RawUserConfig = unknown;
export type InputOptions = ElogConfig | ElogConfig[];

export interface ConfigDiagnostic {
  level: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface ResolveConfigResult {
  workflows: import('../runtime/types').RuntimeWorkflowConfig[];
  diagnostics: ConfigDiagnostic[];
}

export interface ElogCacheConfig {
  /** Whether to disable cache for this workflow. */
  disableCache?: boolean;
  /** Cache file path. */
  cacheFilePath?: string;
}

export interface ElogConfig extends ElogCacheConfig {
  /** Optional workflow id. */
  id?: string;
  /** Whether to disable this workflow. */
  disable?: boolean;
  /** Source plugin. */
  from: FromPlugin;
  /** Deploy target plugins. */
  to: ToPlugin | ToPlugin[];
  /** Transform plugins. */
  plugins?: TransformPlugin[];
  /** Deploy execution strategy. Defaults to serial. */
  deployStrategy?: 'serial' | 'parallel';
}

export type AnyElogPlugin = ElogPlugin;
```

- [ ] **Step 4: Keep defineConfig as raw identity helper**

Modify `packages/elog/src/utils/elog.ts`:

```ts
import type { ElogConfig } from '../types/common';

export function defineConfig(config: ElogConfig | ElogConfig[]) {
  return config;
}
```

- [ ] **Step 5: Create legacy v0 detector**

Create `packages/elog/src/config/adapters/legacy-v0.ts`:

```ts
import type { ConfigDiagnostic } from '../../types/common';

export interface LegacyAdapterResult {
  handled: boolean;
  diagnostics: ConfigDiagnostic[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function detectLegacyV0Config(raw: unknown): LegacyAdapterResult {
  if (!isRecord(raw)) {
    return { handled: false, diagnostics: [] };
  }

  const legacyKeys = ['write', 'deploy', 'image', 'platform'];
  const matched = legacyKeys.some((key) => key in raw);

  if (!matched) {
    return { handled: false, diagnostics: [] };
  }

  return {
    handled: true,
    diagnostics: [
      {
        level: 'error',
        code: 'LEGACY_V0_CONFIG_DETECTED',
        message:
          'Detected an Elog 0.x style config. The 1.0 foundation can detect this format, but full migration support will be implemented by the migrate command.',
      },
    ],
  };
}
```

- [ ] **Step 6: Create v1 adapter and normalization**

Create `packages/elog/src/config/adapters/v1.ts`:

```ts
import type { ElogConfig } from '../../types/common';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isV1Config(raw: unknown): raw is ElogConfig | ElogConfig[] {
  if (Array.isArray(raw)) {
    return raw.every((item) => isRecord(item) && ('from' in item || 'to' in item));
  }

  return isRecord(raw) && ('from' in raw || 'to' in raw);
}
```

Create `packages/elog/src/config/normalize.ts`:

```ts
import type { ElogConfig } from '../types/common';
import type { RuntimeWorkflowConfig } from '../runtime/types';

export function normalizeV1Config(raw: ElogConfig | ElogConfig[]): RuntimeWorkflowConfig[] {
  const configs = Array.isArray(raw) ? raw : [raw];
  const useIndexedCacheNames = configs.length > 1;

  return configs.map((config, index) => {
    const workflowNumber = index + 1;
    const cacheFilePath =
      config.cacheFilePath ??
      (useIndexedCacheNames ? `elog.cache${workflowNumber}.json` : 'elog.cache.json');

    return {
      id: config.id ?? `workflow-${workflowNumber}`,
      disabled: config.disable ?? false,
      cache: {
        disabled: config.disableCache ?? false,
        filePath: cacheFilePath,
      },
      from: config.from,
      transforms: config.plugins ?? [],
      to: Array.isArray(config.to) ? config.to : [config.to],
      deployStrategy: config.deployStrategy ?? 'serial',
    };
  });
}
```

- [ ] **Step 7: Create validation**

Create `packages/elog/src/config/validate.ts`:

```ts
import type { ConfigDiagnostic } from '../types/common';
import type { RuntimeWorkflowConfig } from '../runtime/types';

export function validateRuntimeConfig(workflows: RuntimeWorkflowConfig[]): ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];
  const seenIds = new Set<string>();

  workflows.forEach((workflow, index) => {
    const path = `workflows[${index}]`;

    if (seenIds.has(workflow.id)) {
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_DUPLICATE_WORKFLOW_ID',
        message: `Duplicate workflow id "${workflow.id}".`,
        path: `${path}.id`,
      });
    }
    seenIds.add(workflow.id);

    if (!workflow.from || workflow.from.kind !== 'from') {
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_MISSING_FROM',
        message: 'Workflow must provide exactly one from plugin.',
        path: `${path}.from`,
      });
    }

    if (!workflow.to.length || workflow.to.some((plugin) => !plugin || plugin.kind !== 'to')) {
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_MISSING_TO',
        message: 'Workflow must provide at least one to plugin.',
        path: `${path}.to`,
      });
    }

    const invalidTransform = workflow.transforms.find(
      (plugin) => !plugin || plugin.kind !== 'transform',
    );
    if (invalidTransform) {
      diagnostics.push({
        level: 'error',
        code: 'CONFIG_INVALID_TRANSFORM',
        message: 'Every transform plugin must declare kind "transform".',
        path: `${path}.plugins`,
      });
    }
  });

  return diagnostics;
}
```

- [ ] **Step 8: Create resolver**

Create `packages/elog/src/config/resolve.ts`:

```ts
import type { RawUserConfig, ResolveConfigResult } from '../types/common';
import { normalizeV1Config } from './normalize';
import { validateRuntimeConfig } from './validate';
import { detectLegacyV0Config } from './adapters/legacy-v0';
import { isV1Config } from './adapters/v1';

export function resolveConfig(raw: RawUserConfig): ResolveConfigResult {
  const legacy = detectLegacyV0Config(raw);
  if (legacy.handled) {
    return { workflows: [], diagnostics: legacy.diagnostics };
  }

  if (!isV1Config(raw)) {
    return {
      workflows: [],
      diagnostics: [
        {
          level: 'error',
          code: 'CONFIG_UNRECOGNIZED',
          message: 'Unable to recognize Elog config shape.',
        },
      ],
    };
  }

  const workflows = normalizeV1Config(raw).filter((workflow) => !workflow.disabled);
  const diagnostics = validateRuntimeConfig(workflows);

  return {
    workflows: diagnostics.some((diagnostic) => diagnostic.level === 'error') ? [] : workflows,
    diagnostics,
  };
}
```

- [ ] **Step 9: Create raw config loader wrapper**

Create `packages/elog/src/config/load.ts` by moving the existing `loadConfigFromFile()` logic from `packages/elog/src/utils/load.ts`, but remove default cache path assignment. The function should return raw data:

```ts
import path from 'path';
import JoyCon from 'joycon';
import { bundleRequire } from 'bundle-require';
import type { RawUserConfig } from '../types/common';

export async function loadConfigFromFile(
  cwd: string,
  configFile?: string,
): Promise<{ path?: string; data?: RawUserConfig }> {
  const configJoycon = new JoyCon();
  const configPath = await configJoycon.resolve({
    files: configFile
      ? [configFile]
      : ['elog.config.ts', 'elog.config.js', 'elog.config.cjs', 'elog.config.mjs'],
    cwd,
    stopDir: path.parse(cwd).root,
    packageKey: 'elog',
  });

  if (!configPath) {
    return {};
  }

  const config = await bundleRequire({ filepath: configPath });

  return {
    path: configPath,
    data: config.mod.default || config.mod,
  };
}
```

- [ ] **Step 10: Run config tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/config/resolve.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add packages/elog/src/config packages/elog/src/types/common.ts packages/elog/src/utils/elog.ts
git commit -m "feat: add config resolution pipeline"
```

## Task 4: Extract CacheStore and Document Filtering

**Files:**
- Create: `packages/elog/src/cache/CacheStore.ts`
- Create: `packages/elog/src/doc/filter.ts`
- Modify: `packages/elog/src/utils/doc/form.ts`
- Test: `packages/elog/src/cache/CacheStore.test.ts`
- Test: `packages/elog/src/doc/filter.test.ts`

- [ ] **Step 1: Write document filtering tests**

Create `packages/elog/src/doc/filter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DocStatus } from '../const';
import { filterDocs } from './filter';
import type { DocDetail } from '../types/doc';

const cachedDoc: DocDetail = {
  id: 'cached',
  title: 'Cached',
  updateTime: 1,
  body: 'body',
  properties: { title: 'Cached', urlname: 'cached' },
};

describe('filterDocs', () => {
  it('returns new docs', () => {
    const result = filterDocs([], [{ id: 'new', updateTime: 1, properties: { title: 'New' } }]);

    expect(result.docList).toHaveLength(1);
    expect(result.docStatusMap.new._status).toBe(DocStatus.NEW);
  });

  it('returns updated docs', () => {
    const result = filterDocs([cachedDoc], [
      { id: 'cached', updateTime: 2, properties: { title: 'Cached' } },
    ]);

    expect(result.docList).toHaveLength(1);
    expect(result.docStatusMap.cached._status).toBe(DocStatus.UPDATE);
  });

  it('retries previously failed docs', () => {
    const failedDoc = { ...cachedDoc, _status: DocStatus.DOC_ERROR };
    const result = filterDocs([failedDoc], [
      { id: 'cached', updateTime: 1, properties: { title: 'Cached' } },
    ]);

    expect(result.docList).toHaveLength(1);
    expect(result.docStatusMap.cached._status).toBe(DocStatus.UPDATE);
  });
});
```

- [ ] **Step 2: Write CacheStore tests**

Create `packages/elog/src/cache/CacheStore.test.ts`:

```ts
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocStatus } from '../const';
import { CacheStore } from './CacheStore';
import type { DocDetail } from '../types/doc';

let tempDir = '';

function makeDoc(id: string): DocDetail {
  return {
    id,
    title: id,
    updateTime: 1,
    body: `body-${id}`,
    properties: { title: id, urlname: id },
  };
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('CacheStore', () => {
  it('loads empty cache when disabled', () => {
    const store = new CacheStore({ disabled: true, filePath: 'missing.json' });

    expect(store.cachedDocList).toEqual([]);
  });

  it('updates and writes cache without body', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-cache-'));
    const cacheFile = path.join(tempDir, 'elog.cache.json');
    const store = new CacheStore({ disabled: false, filePath: cacheFile });

    store.update([makeDoc('a')], {
      a: { _updateIndex: -1, _status: DocStatus.NEW },
    });
    store.write([{ id: 'a', updateTime: 1 }]);

    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    expect(cache.cachedDocList[0].id).toBe('a');
    expect(cache.cachedDocList[0]).not.toHaveProperty('body');
    expect(cache.sortedDocList).toEqual([{ id: 'a', updateTime: 1 }]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/doc/filter.test.ts src/cache/CacheStore.test.ts
```

Expected: FAIL because `doc/filter` and `CacheStore` do not exist.

- [ ] **Step 4: Create document filter helper**

Create `packages/elog/src/doc/filter.ts`:

```ts
import { DocStatus } from '../const';
import type { DocDetail, SortedDoc } from '../types/doc';
import out from '../utils/logger';

export interface DocStatusEntry {
  _updateIndex: number;
  _status: DocStatus;
}

export type DocStatusMap = Record<string, DocStatusEntry>;

export function filterDocs<T>(cachedDocList: DocDetail[], docs: SortedDoc<T>[]) {
  const activeCachedDocs = cachedDocList.filter((cache) =>
    docs.some((item) => item.id === cache.id),
  );
  const needUpdateDocList: Array<T & { _index: number }> = [];
  const docStatusMap: DocStatusMap = {};

  for (const doc of docs) {
    const cacheIndex = activeCachedDocs.findIndex((cacheItem) => cacheItem.id === doc.id);

    if (cacheIndex < 0) {
      needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
      docStatusMap[doc.id] = { _updateIndex: -1, _status: DocStatus.NEW };
      continue;
    }

    const cacheDoc = activeCachedDocs[cacheIndex];
    let needUpdate = doc.updateTime !== cacheDoc.updateTime;

    if ([DocStatus.DOC_ERROR, DocStatus.IMAGE_ERROR].includes(cacheDoc._status)) {
      out.warn(
        `上次同步时【${cacheDoc.properties.title}】存在图片/文档下载失败，本次将尝试重新同步。如果并不需要当前文档参与本次同步，请在缓存文件中找到此文档并删除 _status 字段`,
      );
      needUpdate = true;
    }

    if (needUpdate) {
      needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
      docStatusMap[doc.id] = { _updateIndex: cacheIndex, _status: DocStatus.UPDATE };
    }
  }

  return {
    docList: needUpdateDocList,
    docStatusMap,
  };
}
```

- [ ] **Step 5: Create CacheStore**

Create `packages/elog/src/cache/CacheStore.ts`:

```ts
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { DocStatus } from '../const';
import type { DocDetail, SortedDoc } from '../types/doc';
import type { CacheConfig } from '../runtime/types';
import type { DocStatusMap } from '../doc/filter';
import out from '../utils/logger';

const require = createRequire(import.meta.url);

export class CacheStore {
  readonly config: CacheConfig;
  readonly cachedDocList: DocDetail[];

  constructor(config: CacheConfig) {
    this.config = config;
    this.cachedDocList = this.load();
  }

  private load(): DocDetail[] {
    if (this.config.disabled) {
      out.success('全量更新', '已禁用缓存，将全量更新文档');
      return [];
    }

    try {
      const cachePath = path.resolve(process.cwd(), this.config.filePath);
      const cacheJson = require(cachePath);
      return cacheJson.cachedDocList ?? [];
    } catch (error: any) {
      out.debug('缓存不存在', `未获取到缓存: ${error.message}`);
      out.success('全量更新', '未获取到缓存，将全量更新文档');
      return [];
    }
  }

  update(docList: DocDetail[], docStatusMap: DocStatusMap) {
    for (const doc of docList) {
      const status = docStatusMap[doc.id];
      if (!status) {
        continue;
      }

      if (status._status === DocStatus.NEW) {
        this.cachedDocList.push(doc);
      } else {
        this.cachedDocList[status._updateIndex] = doc;
      }
    }
  }

  write<T>(sortedDocList: SortedDoc<T>[] = []) {
    const cacheJson = {
      cachedDocList: this.cachedDocList.map((item) => {
        const { body: _body, ...docWithoutBody } = item;
        return docWithoutBody;
      }),
      sortedDocList,
    };

    fs.writeFileSync(this.config.filePath, JSON.stringify(cacheJson, null, 2), {
      encoding: 'utf8',
    });
  }
}
```

- [ ] **Step 6: Re-export old helper path temporarily**

Modify `packages/elog/src/utils/doc/form.ts` so existing plugin imports still compile while migration is in progress:

```ts
export { filterDocs } from '../../doc/filter';
export type { DocStatusMap } from '../../doc/filter';
```

Keep `asyncPoolFunc`, `DocFrom`, `GetSortedDocList`, `GetDocDetail`, and `getDocDetailList` in this file until Task 8 refactors no-change handling.

- [ ] **Step 7: Run tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/doc/filter.test.ts src/cache/CacheStore.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/elog/src/doc packages/elog/src/cache packages/elog/src/utils/doc/form.ts
git commit -m "feat: extract cache store and doc filtering"
```

## Task 5: Replace PluginDriver With Elog Lifecycle Runner

**Files:**
- Create: `packages/elog/src/runtime/PluginDriver.ts`
- Test: `packages/elog/src/runtime/PluginDriver.test.ts`
- Modify: `packages/elog/src/index.ts`

- [ ] **Step 1: Write PluginDriver tests**

Create `packages/elog/src/runtime/PluginDriver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ElogPluginError } from '../plugins/errors';
import type { FromPlugin, PluginContext, ToPlugin, TransformPlugin } from '../plugins/types';
import { PluginDriver } from './PluginDriver';

const ctx = {
  workflow: { id: 'workflow-1', cacheFilePath: 'elog.cache.json' },
  logger: {
    debug: () => undefined,
    success: () => undefined,
    error: (message: string) => {
      throw new Error(message);
    },
    info: () => undefined,
    warn: () => undefined,
  },
  http: {} as PluginContext['http'],
  cache: { docList: [] },
  image: {} as PluginContext['image'],
} satisfies PluginContext;

const from: FromPlugin = {
  name: 'from:mock',
  kind: 'from',
  async download() {
    return {
      docDetailList: [
        {
          id: 'a',
          title: 'A',
          updateTime: 1,
          body: 'A',
          properties: { title: 'A', urlname: 'a' },
        },
      ],
      sortedDocList: [{ id: 'a', updateTime: 1 }],
      docStatusMap: { a: { _updateIndex: -1, _status: 1 } },
    };
  },
};

describe('PluginDriver', () => {
  it('runs transform plugins as a serial reducer', async () => {
    const first: TransformPlugin = {
      name: 'transform:first',
      kind: 'transform',
      async transform(docs) {
        return docs.map((doc) => ({ ...doc, body: `${doc.body}-first` }));
      },
    };
    const second: TransformPlugin = {
      name: 'transform:second',
      kind: 'transform',
      async transform(docs) {
        return docs.map((doc) => ({ ...doc, body: `${doc.body}-second` }));
      },
    };
    const driver = new PluginDriver({ from, transforms: [first, second], to: [] }, ctx);
    const downloaded = await driver.runDownloadHook();
    const transformed = await driver.runTransformPipeline(downloaded.docDetailList);

    expect(transformed[0].body).toBe('A-first-second');
  });

  it('wraps plugin hook failures', async () => {
    const bad: TransformPlugin = {
      name: 'transform:bad',
      kind: 'transform',
      async transform() {
        throw new Error('bad transform');
      },
    };
    const driver = new PluginDriver({ from, transforms: [bad], to: [] }, ctx);

    await expect(driver.runTransformPipeline([])).rejects.toMatchObject({
      name: 'ElogPluginError',
      pluginName: 'transform:bad',
      hookName: 'transform',
    } satisfies Partial<ElogPluginError>);
  });

  it('runs deploy hooks serially by default', async () => {
    const calls: string[] = [];
    const first: ToPlugin = {
      name: 'to:first',
      kind: 'to',
      deploy() {
        calls.push('first');
      },
    };
    const second: ToPlugin = {
      name: 'to:second',
      kind: 'to',
      deploy() {
        calls.push('second');
      },
    };
    const driver = new PluginDriver({ from, transforms: [], to: [first, second] }, ctx);

    await driver.runDeployHooks([], 'serial');

    expect(calls).toEqual(['first', 'second']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/runtime/PluginDriver.test.ts
```

Expected: FAIL because `runtime/PluginDriver` does not exist.

- [ ] **Step 3: Create lifecycle PluginDriver**

Create `packages/elog/src/runtime/PluginDriver.ts`:

```ts
import { ElogPluginError } from '../plugins/errors';
import type {
  DownloadResult,
  FromPlugin,
  PluginContext,
  ToPlugin,
  TransformPlugin,
} from '../plugins/types';
import type { DocDetail } from '../types/doc';

export interface PluginDriverOptions {
  from: FromPlugin;
  transforms: TransformPlugin[];
  to: ToPlugin[];
}

export class PluginDriver {
  readonly from: FromPlugin;
  readonly transforms: TransformPlugin[];
  readonly to: ToPlugin[];
  private readonly ctx: PluginContext;

  constructor(options: PluginDriverOptions, ctx: PluginContext) {
    this.from = options.from;
    this.transforms = options.transforms;
    this.to = options.to;
    this.ctx = ctx;
  }

  async runDownloadHook(): Promise<DownloadResult> {
    try {
      return await this.from.download(this.ctx);
    } catch (error) {
      throw new ElogPluginError(this.from.name, 'download', error);
    }
  }

  async runTransformPipeline(docDetailList: DocDetail[]): Promise<DocDetail[]> {
    let output = docDetailList;

    for (const plugin of this.transforms) {
      try {
        output = await plugin.transform(output, this.ctx);
      } catch (error) {
        throw new ElogPluginError(plugin.name, 'transform', error);
      }
    }

    return output;
  }

  async runDeployHooks(
    docDetailList: DocDetail[],
    deployStrategy: 'serial' | 'parallel',
  ): Promise<void> {
    if (deployStrategy === 'parallel') {
      await Promise.all(this.to.map((plugin) => this.runDeployHook(plugin, docDetailList)));
      return;
    }

    for (const plugin of this.to) {
      await this.runDeployHook(plugin, docDetailList);
    }
  }

  private async runDeployHook(plugin: ToPlugin, docDetailList: DocDetail[]) {
    try {
      const docsForDeploy = docDetailList.map((doc) => ({ ...doc }));
      await plugin.deploy(docsForDeploy, this.ctx);
    } catch (error) {
      throw new ElogPluginError(plugin.name, 'deploy', error);
    }
  }
}
```

- [ ] **Step 4: Export lifecycle PluginDriver**

Modify `packages/elog/src/index.ts`:

```ts
export { PluginDriver } from './runtime/PluginDriver';
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/runtime/PluginDriver.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/elog/src/runtime/PluginDriver.ts packages/elog/src/runtime/PluginDriver.test.ts packages/elog/src/index.ts
git commit -m "feat: add lifecycle plugin driver"
```

## Task 6: Add Graph and WorkflowRunner Results

**Files:**
- Create: `packages/elog/src/runtime/Graph.ts`
- Create: `packages/elog/src/runtime/WorkflowRunner.ts`
- Modify: `packages/elog/src/node-entry.ts`
- Test: `packages/elog/src/runtime/Graph.test.ts`
- Test: `packages/elog/src/runtime/WorkflowRunner.test.ts`

- [ ] **Step 1: Write Graph tests**

Create `packages/elog/src/runtime/Graph.test.ts`:

```ts
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocStatus } from '../const';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';
import { Graph } from './Graph';
import type { RuntimeWorkflowConfig } from './types';

let tempDir = '';

function config(overrides: Partial<RuntimeWorkflowConfig> = {}): RuntimeWorkflowConfig {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
  const from: FromPlugin = {
    name: 'from:mock',
    kind: 'from',
    async download() {
      return {
        docDetailList: [
          {
            id: 'a',
            title: 'A',
            updateTime: 1,
            body: 'A',
            properties: { title: 'A', urlname: 'a' },
          },
        ],
        sortedDocList: [{ id: 'a', updateTime: 1 }],
        docStatusMap: { a: { _updateIndex: -1, _status: DocStatus.NEW } },
      };
    },
  };
  const to: ToPlugin = {
    name: 'to:mock',
    kind: 'to',
    deploy() {},
  };

  return {
    id: 'workflow-1',
    disabled: false,
    cache: { disabled: false, filePath: path.join(tempDir, 'elog.cache.json') },
    from,
    transforms: [],
    to: [to],
    deployStrategy: 'serial',
    ...overrides,
  };
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('Graph', () => {
  it('returns success result and writes cache', async () => {
    const workflow = config();
    const result = await new Graph(workflow).sync();

    expect(result).toMatchObject({
      status: 'success',
      workflowId: 'workflow-1',
      syncedCount: 1,
      cacheFilePath: workflow.cache.filePath,
    });
    expect(fs.existsSync(workflow.cache.filePath)).toBe(true);
  });

  it('does not deploy when transform fails', async () => {
    let deployed = false;
    const badTransform: TransformPlugin = {
      name: 'transform:bad',
      kind: 'transform',
      async transform() {
        throw new Error('bad');
      },
    };
    const to: ToPlugin = {
      name: 'to:mock',
      kind: 'to',
      deploy() {
        deployed = true;
      },
    };
    const result = await new Graph(config({ transforms: [badTransform], to: [to] })).sync();

    expect(result.status).toBe('failed');
    expect(deployed).toBe(false);
  });
});
```

- [ ] **Step 2: Write WorkflowRunner tests**

Create `packages/elog/src/runtime/WorkflowRunner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RuntimeWorkflowConfig, WorkflowResult } from './types';
import { WorkflowRunner } from './WorkflowRunner';

function workflow(id: string): RuntimeWorkflowConfig {
  return {
    id,
    disabled: false,
    cache: { disabled: true, filePath: `${id}.json` },
    from: {
      name: `from:${id}`,
      kind: 'from',
      async download() {
        return { docDetailList: [], sortedDocList: [], docStatusMap: {} };
      },
    },
    transforms: [],
    to: [
      {
        name: `to:${id}`,
        kind: 'to',
        deploy() {},
      },
    ],
    deployStrategy: 'serial',
  };
}

describe('WorkflowRunner', () => {
  it('skips disabled workflows', async () => {
    const runner = new WorkflowRunner();
    const results = await runner.runAll([{ ...workflow('a'), disabled: true }]);

    expect(results).toEqual([
      { status: 'skipped', workflowId: 'a', reason: 'disabled' } satisfies WorkflowResult,
    ]);
  });

  it('runs workflows serially', async () => {
    const runner = new WorkflowRunner();
    const results = await runner.runAll([workflow('a'), workflow('b')]);

    expect(results.map((result) => result.workflowId)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/runtime/Graph.test.ts src/runtime/WorkflowRunner.test.ts
```

Expected: FAIL because `Graph` and `WorkflowRunner` do not exist.

- [ ] **Step 4: Create Graph**

Create `packages/elog/src/runtime/Graph.ts`:

```ts
import { CacheStore } from '../cache/CacheStore';
import { createPluginContext } from '../plugins/context';
import { ElogError } from '../plugins/errors';
import { PluginDriver } from './PluginDriver';
import type { RuntimeWorkflowConfig, WorkflowResult } from './types';

export class Graph {
  readonly config: RuntimeWorkflowConfig;

  constructor(config: RuntimeWorkflowConfig) {
    this.config = config;
  }

  async sync(): Promise<WorkflowResult> {
    const cacheStore = new CacheStore(this.config.cache);
    const ctx = createPluginContext({
      workflow: {
        id: this.config.id,
        cacheFilePath: this.config.cache.filePath,
      },
      cachedDocList: cacheStore.cachedDocList,
    });
    const pluginDriver = new PluginDriver(
      {
        from: this.config.from,
        transforms: this.config.transforms,
        to: this.config.to,
      },
      ctx,
    );

    try {
      const downloadResult = await pluginDriver.runDownloadHook();
      if (!downloadResult.docDetailList.length) {
        return { status: 'skipped', workflowId: this.config.id, reason: 'no-changes' };
      }

      const docDetailList = await pluginDriver.runTransformPipeline(downloadResult.docDetailList);
      cacheStore.update(docDetailList, downloadResult.docStatusMap);
      await pluginDriver.runDeployHooks(docDetailList, this.config.deployStrategy);
      cacheStore.write(downloadResult.sortedDocList ?? []);

      return {
        status: 'success',
        workflowId: this.config.id,
        syncedCount: docDetailList.length,
        cacheFilePath: this.config.cache.filePath,
        sortedDocList: downloadResult.sortedDocList ?? [],
      };
    } catch (error) {
      return {
        status: 'failed',
        workflowId: this.config.id,
        error: error instanceof ElogError ? error : new ElogError('Workflow failed', error),
      };
    }
  }
}
```

- [ ] **Step 5: Create WorkflowRunner**

Create `packages/elog/src/runtime/WorkflowRunner.ts`:

```ts
import { Graph } from './Graph';
import type { RuntimeWorkflowConfig, WorkflowResult } from './types';

export class WorkflowRunner {
  async runAll(workflows: RuntimeWorkflowConfig[]): Promise<WorkflowResult[]> {
    const results: WorkflowResult[] = [];

    for (const workflow of workflows) {
      if (workflow.disabled) {
        results.push({
          status: 'skipped',
          workflowId: workflow.id,
          reason: 'disabled',
        });
        continue;
      }

      const result = await new Graph(workflow).sync();
      results.push(result);

      if (result.status === 'failed') {
        break;
      }
    }

    return results;
  }
}
```

- [ ] **Step 6: Update node entry**

Modify `packages/elog/src/node-entry.ts`:

```ts
import type { InputOptions } from './types/common';
import { resolveConfig } from './config/resolve';
import { ElogConfigError } from './plugins/errors';
import { WorkflowRunner } from './runtime/WorkflowRunner';
import type { WorkflowResult } from './runtime/types';

export default elog;

export async function elog(rawInputOptions: InputOptions): Promise<WorkflowResult[]> {
  return elogInternal(rawInputOptions);
}

export async function elogInternal(rawInputOptions: InputOptions): Promise<WorkflowResult[]> {
  if (!rawInputOptions) {
    throw new ElogConfigError('You must supply options to elog');
  }

  const resolved = resolveConfig(rawInputOptions);
  const errorDiagnostic = resolved.diagnostics.find((diagnostic) => diagnostic.level === 'error');
  if (errorDiagnostic) {
    throw new ElogConfigError(errorDiagnostic.message);
  }

  return new WorkflowRunner().runAll(resolved.workflows);
}
```

- [ ] **Step 7: Export runtime classes**

Modify `packages/elog/src/index.ts`:

```ts
export { Graph } from './runtime/Graph';
export { WorkflowRunner } from './runtime/WorkflowRunner';
```

- [ ] **Step 8: Run tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/runtime/Graph.test.ts src/runtime/WorkflowRunner.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/elog/src/runtime packages/elog/src/node-entry.ts packages/elog/src/index.ts
git commit -m "feat: add structured workflow runtime"
```

## Task 7: Refactor No-Change Handling Away From `process.exit()`

**Files:**
- Modify: `packages/elog/src/utils/doc/form.ts`
- Test: `packages/elog/src/utils/doc/form.test.ts`

- [ ] **Step 1: Write no-change helper test**

Create `packages/elog/src/utils/doc/form.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { getDocDetailList } from './form';

describe('getDocDetailList', () => {
  it('returns empty download result instead of exiting when no docs changed', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit should not be called');
    });

    const result = await getDocDetailList({
      cachedDocList: [
        {
          id: 'a',
          title: 'A',
          updateTime: 1,
          body: 'A',
          properties: { title: 'A', urlname: 'a' },
        },
      ],
      async getSortedDocList() {
        return [{ id: 'a', updateTime: 1, properties: { title: 'A' } }];
      },
      async getDocDetail() {
        throw new Error('should not download unchanged doc');
      },
      limit: 1,
    });

    expect(exitSpy).not.toHaveBeenCalled();
    expect(result.docDetailList).toEqual([]);
    expect(result.sortedDocList).toEqual([{ id: 'a', updateTime: 1, properties: { title: 'A' } }]);
    expect(result.docStatusMap).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/utils/doc/form.test.ts
```

Expected: FAIL because current implementation calls `process.exit()`.

- [ ] **Step 3: Modify `getDocDetailList()` no-change branch**

In `packages/elog/src/utils/doc/form.ts`, replace:

```ts
if (!needUpdateDocList.length) {
  out.success('任务结束', '没有需要同步的文档');
  process.exit();
}
```

with:

```ts
if (!needUpdateDocList.length) {
  out.success('任务结束', '没有需要同步的文档');
  return {
    docDetailList: [],
    sortedDocList,
    docStatusMap,
  };
}
```

- [ ] **Step 4: Run no-change test**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/utils/doc/form.test.ts
```

Expected: PASS.

- [ ] **Step 5: Find remaining sync-path process exits**

Run:

```bash
rg "process.exit" packages/elog/src playground -g "*.ts" -g "!**/dist/**" -g "!**/node_modules/**"
```

Expected: `packages/elog/src/utils/doc/form.ts` no longer appears. `logger.ts` can remain in the output for CLI fatal errors; plugin-level no-op exits are handled in Task 9.

- [ ] **Step 6: Commit**

```bash
git add packages/elog/src/utils/doc/form.ts packages/elog/src/utils/doc/form.test.ts
git commit -m "fix: return no-change result without exiting"
```

## Task 8: Update CLI Sync To Use Config Resolver and Results

**Files:**
- Modify: `packages/elog/src/commands/sync.ts`
- Modify: `packages/elog/src/utils/find-config.ts`
- Modify: `packages/elog/src/utils/load.ts`
- Test: `packages/elog/src/commands/sync.test.ts`

- [ ] **Step 1: Write sync result formatter test**

Create `packages/elog/src/commands/sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatWorkflowResults } from './sync';
import type { WorkflowResult } from '../runtime/types';
import { ElogError } from '../plugins/errors';

describe('formatWorkflowResults', () => {
  it('formats success, skipped, and failed results', () => {
    const results: WorkflowResult[] = [
      {
        status: 'success',
        workflowId: 'workflow-1',
        syncedCount: 2,
        cacheFilePath: 'elog.cache.json',
        sortedDocList: [],
      },
      { status: 'skipped', workflowId: 'workflow-2', reason: 'no-changes' },
      { status: 'failed', workflowId: 'workflow-3', error: new ElogError('boom') },
    ];

    expect(formatWorkflowResults(results)).toEqual([
      'workflow-1: synced 2 document(s), cache elog.cache.json',
      'workflow-2: skipped (no-changes)',
      'workflow-3: failed (boom)',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/sync.test.ts
```

Expected: FAIL because `formatWorkflowResults` does not exist.

- [ ] **Step 3: Update old utils loaders to delegate to new config loader**

Modify `packages/elog/src/utils/load.ts`:

```ts
export { loadConfigFromFile } from '../config/load';
```

Modify `packages/elog/src/utils/find-config.ts`:

```ts
import { loadConfigFromFile } from '../config/load';
import out from './logger';

export const findConfig = async (customConfigPath?: string) => {
  const config = await loadConfigFromFile(process.cwd(), customConfigPath);
  const configData = config.data;
  if (!configData) {
    out.error('未找到 Elog 配置文件');
  }
  return configData;
};
```

- [ ] **Step 4: Update sync command**

Modify `packages/elog/src/commands/sync.ts`:

```ts
import path from 'path';
import dotenv from 'dotenv';
import { findConfig } from '../utils/find-config';
import elog from '../node-entry';
import out from '../utils/logger';
import type { WorkflowResult } from '../runtime/types';

export function formatWorkflowResults(results: WorkflowResult[]): string[] {
  return results.map((result) => {
    if (result.status === 'success') {
      return `${result.workflowId}: synced ${result.syncedCount} document(s), cache ${result.cacheFilePath}`;
    }

    if (result.status === 'skipped') {
      return `${result.workflowId}: skipped (${result.reason})`;
    }

    return `${result.workflowId}: failed (${result.error.message})`;
  });
}

const sync = async (customConfigPath?: string, envPath?: string, enableDebug?: boolean) => {
  if (enableDebug) {
    process.env.DEBUG = 'true';
  }

  const rootDir = process.cwd();

  if (envPath) {
    envPath = path.resolve(rootDir, envPath);
    out.info('环境变量', `已指定读取env文件为：${envPath}`);
    dotenv.config({ override: true, path: envPath });
  } else {
    out.info('环境变量', `未指定env文件，将从系统环境变量中读取`);
  }

  const userConfig = await findConfig(customConfigPath);
  const results = await elog(userConfig!);

  for (const line of formatWorkflowResults(results)) {
    out.info('同步结果', line);
  }

  const failed = results.find((result) => result.status === 'failed');
  if (failed) {
    out.error(failed.error.message);
  }
};

export default sync;
```

- [ ] **Step 5: Run sync command tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/sync.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/elog/src/commands/sync.ts packages/elog/src/commands/sync.test.ts packages/elog/src/utils/load.ts packages/elog/src/utils/find-config.ts
git commit -m "refactor: route sync through structured runtime results"
```

## Task 9: Migrate In-Repo Plugin Entrypoints To Explicit Contract

**Files:**
- Modify: `playground/plugin-from-*/src/index.ts`
- Modify: `playground/plugin-image-*/src/index.ts`
- Modify: `playground/plugin-to-*/src/index.ts`
- Modify: plugin `src/*Client.ts`, `src/*Api.ts`, `src/*Deploy.ts` files that contain old flat context access

- [ ] **Step 1: Update source plugin entrypoint pattern**

For each source plugin entrypoint:

- `playground/plugin-from-feishu-space/src/index.ts`
- `playground/plugin-from-feishu-wiki/src/index.ts`
- `playground/plugin-from-flowus/src/index.ts`
- `playground/plugin-from-notion/src/index.ts`
- `playground/plugin-from-wolai/src/index.ts`
- `playground/plugin-from-yuque-pwd/src/index.ts`
- `playground/plugin-from-yuque-token/src/index.ts`

use this exact shape, replacing config/client names per file:

```ts
import type { FromPlugin } from '@elogx-test/elog';
import type { NotionConfig } from './types';
import NotionClient from './NotionClient';

export default function notion(options: Partial<NotionConfig>): FromPlugin {
  return {
    name: 'from:notion',
    kind: 'from',
    async download(ctx) {
      const notion = new NotionClient(options as NotionConfig, ctx);
      return notion.getDocDetailList();
    },
  };
}
```

Use these function/name/client mappings:

| File | Function | Name | Config | Client |
| --- | --- | --- | --- | --- |
| `plugin-from-feishu-space/src/index.ts` | `feishuSpace` | `from:feishu-space` | `FeiShuConfig` | `FeiShuClient` |
| `plugin-from-feishu-wiki/src/index.ts` | `feishuWiki` | `from:feishu-wiki` | `FeiShuConfig` | `FeiShuClient` |
| `plugin-from-flowus/src/index.ts` | `flowus` | `from:flowus` | `FlowUsConfig` | `FlowUsClient` |
| `plugin-from-notion/src/index.ts` | `notion` | `from:notion` | `NotionConfig` | `NotionClient` |
| `plugin-from-wolai/src/index.ts` | `wolai` | `from:wolai` | `WoLaiConfig` | `WolaiClient` |
| `plugin-from-yuque-pwd/src/index.ts` | `yuquePwd` | `from:yuque-pwd` | `YuqueInputConfig` | `YuqueClient` |
| `plugin-from-yuque-token/src/index.ts` | `yuqueToken` | `from:yuque-token` | `YuqueInputConfig` | `YuqueClient` |

- [ ] **Step 2: Update image transform plugin entrypoint pattern**

For each image plugin entrypoint:

- `playground/plugin-image-cos/src/index.ts`
- `playground/plugin-image-github/src/index.ts`
- `playground/plugin-image-local/src/index.ts`
- `playground/plugin-image-oss/src/index.ts`
- `playground/plugin-image-qiniu/src/index.ts`
- `playground/plugin-image-upyun/src/index.ts`

use this exact shape, replacing config/client names per file:

```ts
import type { TransformPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import type { ImageLocalConfig } from './types';

export default function imageLocal(options: Partial<ImageLocalConfig>): TransformPlugin {
  return {
    name: 'transform:image-local',
    kind: 'transform',
    transform(docs, ctx) {
      const imageLocal = new ImageClient(options as ImageLocalConfig, ctx);
      return imageLocal.replaceImages(docs);
    },
  };
}
```

Use these function/name/config/client method mappings:

| File | Function | Name | Config | Client method |
| --- | --- | --- | --- | --- |
| `plugin-image-cos/src/index.ts` | `imageCos` | `transform:image-cos` | `ImageCOSConfig` | `processImages` |
| `plugin-image-github/src/index.ts` | `imageGithub` | `transform:image-github` | `ImageGithubConfig` | `processImages` |
| `plugin-image-local/src/index.ts` | `imageLocal` | `transform:image-local` | `ImageLocalConfig` | `replaceImages` |
| `plugin-image-oss/src/index.ts` | `imageOss` | `transform:image-oss` | `ImageOSSConfig` | `processImages` |
| `plugin-image-qiniu/src/index.ts` | `imageQiniu` | `transform:image-qiniu` | `ImageQiniuConfig` | `processImages` |
| `plugin-image-upyun/src/index.ts` | `imageUpyun` | `transform:image-upyun` | `ImageUPYunConfig` | `processImages` |

- [ ] **Step 3: Update deploy plugin entrypoint pattern**

For each deploy plugin entrypoint:

- `playground/plugin-to-confluence/src/index.ts`
- `playground/plugin-to-halo/src/index.ts`
- `playground/plugin-to-local/src/index.ts`
- `playground/plugin-to-wordpress/src/index.ts`

use this exact shape, replacing config/deploy names per file:

```ts
import type { ToPlugin } from '@elogx-test/elog';
import LocalDeploy from './LocalDeploy';
import { LocalConfig } from './types';

export default function toLocal(options: Partial<LocalConfig>): ToPlugin {
  return {
    name: 'to:local',
    kind: 'to',
    deploy(docs, ctx) {
      const localDeploy = new LocalDeploy(options as LocalConfig, ctx);
      localDeploy.deploy(docs);
    },
  };
}
```

Use these function/name/config/deploy mappings:

| File | Function | Name | Config | Deploy class |
| --- | --- | --- | --- | --- |
| `plugin-to-confluence/src/index.ts` | `toConfluence` | `to:confluence` | `ConfluenceConfig` | `ConfluenceDeploy` |
| `plugin-to-halo/src/index.ts` | `toHalo` | `to:halo` | `HaloConfig` | `HaloDeploy` |
| `plugin-to-local/src/index.ts` | `toLocal` | `to:local` | `LocalConfig` | `LocalDeploy` |
| `plugin-to-wordpress/src/index.ts` | `toWordPress` | `to:wordpress` | `WordPressConfig` | `WordPressDeploy` |

- [ ] **Step 4: Replace old context property usage**

Run:

```bash
rg "ctx\\.|this\\.ctx|imgUtil|\\.info\\(|\\.warn\\(|\\.success\\(" playground packages/elog/src -g "*.ts" -g "!**/dist/**" -g "!**/node_modules/**"
```

For plugin classes that receive `PluginContext`, update old flat context calls:

```ts
this.ctx.info('图片替换', value);
this.ctx.warn('message');
this.ctx.imgUtil.getUrlListFromContent(body);
```

to grouped calls:

```ts
this.ctx.logger.info('图片替换', value);
this.ctx.logger.warn('message');
this.ctx.image.getUrlListFromContent(body);
```

Keep imports named `PluginContext` from `@elogx-test/elog`; after Task 2 that name resolves to the grouped context type.

- [ ] **Step 5: Remove plugin-level no-doc `process.exit()`**

In `playground/plugin-to-local/src/LocalDeploy.ts`, replace:

```ts
if (!docDetailList?.length) {
  this.ctx.success('任务结束', '没有需要部署的文档');
  process.exit();
}
```

with:

```ts
if (!docDetailList?.length) {
  this.ctx.logger.success('任务结束', '没有需要部署的文档');
  return;
}
```

Run:

```bash
rg "process.exit" playground -g "*.ts" -g "!**/dist/**" -g "!**/node_modules/**"
```

Expected output after this task can still include provider authentication exits in source plugins, such as Yuque credential failures. This task only converts no-document/no-op sync-path exits to `return`.

- [ ] **Step 6: Build all packages**

Run:

```bash
pnpm build
```

Expected: all packages compile, with failures limited to remaining context API references. Fix each compile failure by converting flat context calls to grouped calls.

- [ ] **Step 7: Commit**

```bash
git add playground packages/elog/src/index.ts
git commit -m "refactor: migrate plugins to explicit contract"
```

## Task 10: Add CLI Fixture Smoke Test

**Files:**
- Create: `tests/fixtures/basic-config/elog.config.ts`
- Create: `tests/fixtures/basic-config/plugins.ts`
- Create: `packages/elog/src/cli-smoke.test.ts`

- [ ] **Step 1: Create fixture plugins**

Create `tests/fixtures/basic-config/plugins.ts`:

```ts
import type { FromPlugin, ToPlugin, TransformPlugin } from '@elogx-test/elog';

export const fromFixture: FromPlugin = {
  name: 'from:fixture',
  kind: 'from',
  async download() {
    return {
      docDetailList: [
        {
          id: 'fixture-doc',
          title: 'Fixture Doc',
          updateTime: 1,
          body: 'fixture',
          properties: { title: 'Fixture Doc', urlname: 'fixture-doc' },
        },
      ],
      sortedDocList: [{ id: 'fixture-doc', updateTime: 1 }],
      docStatusMap: {
        'fixture-doc': { _updateIndex: -1, _status: 1 },
      },
    };
  },
};

export const transformFixture: TransformPlugin = {
  name: 'transform:fixture',
  kind: 'transform',
  async transform(docs) {
    return docs.map((doc) => ({ ...doc, body: `${doc.body}-transformed` }));
  },
};

export const toFixture: ToPlugin = {
  name: 'to:fixture',
  kind: 'to',
  deploy() {},
};
```

- [ ] **Step 2: Create fixture config**

Create `tests/fixtures/basic-config/elog.config.ts`:

```ts
import { defineConfig } from '@elogx-test/elog';
import { fromFixture, toFixture, transformFixture } from './plugins';

export default defineConfig({
  id: 'fixture',
  cacheFilePath: 'fixture.cache.json',
  from: fromFixture,
  plugins: [transformFixture],
  to: toFixture,
});
```

- [ ] **Step 3: Write smoke test**

Create `packages/elog/src/cli-smoke.test.ts`:

```ts
import path from 'path';
import { describe, expect, it } from 'vitest';
import { loadConfigFromFile } from './config/load';
import elog from './node-entry';

describe('fixture sync smoke', () => {
  it('loads fixture config and runs sync through runtime', async () => {
    const fixtureDir = path.resolve(process.cwd(), '../../tests/fixtures/basic-config');
    const loaded = await loadConfigFromFile(fixtureDir, 'elog.config.ts');

    expect(loaded.data).toBeTruthy();

    const results = await elog(loaded.data);

    expect(results[0]).toMatchObject({
      status: 'success',
      workflowId: 'fixture',
      syncedCount: 1,
    });
  });
});
```

- [ ] **Step 4: Run smoke test**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/cli-smoke.test.ts
```

Expected: PASS.

- [ ] **Step 5: Remove generated fixture cache**

Run:

```bash
rm -f tests/fixtures/basic-config/fixture.cache.json
```

Expected: file does not exist after cleanup.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/basic-config packages/elog/src/cli-smoke.test.ts
git commit -m "test: add fixture sync smoke test"
```

## Task 11: Clean Old Core Entrypoints and Compatibility Shims

**Files:**
- Modify: `packages/elog/src/index.ts`
- Modify or delete: `packages/elog/src/Graph.ts`
- Modify or delete: `packages/elog/src/utils/PluginDriver.ts`
- Modify or delete: `packages/elog/src/utils/PluginContext.ts`
- Modify: `packages/elog/src/utils/context/*.ts`
- Modify: `packages/elog/src/types/plugin.ts`

- [ ] **Step 1: Check old imports**

Run:

```bash
rg "utils/PluginDriver|utils/PluginContext|from './Graph'|from '../Graph'|types/plugin|ElogFromContext|ElogImageContext|ElogBaseContext" packages playground -g "*.ts" -g "!**/dist/**" -g "!**/node_modules/**"
```

Expected: only intentional compatibility exports remain.

- [ ] **Step 2: Update context base classes for grouped context**

Modify `packages/elog/src/utils/context/BaseContext.ts`:

```ts
import type { PluginContext } from '../../plugins/types';

export class ElogBaseContext {
  readonly ctx: PluginContext;

  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
```

Modify `packages/elog/src/utils/context/ImageContext.ts` to use `ctx.logger` and `ctx.image` via the new context type. Keep the class exported if in-repo image plugins still extend it.

Modify `packages/elog/src/utils/context/FromContext.ts` to import `PluginContext` from `../../plugins/types` and to read cached docs from `this.ctx.cache.docList`.

- [ ] **Step 3: Replace old type exports**

Modify `packages/elog/src/types/plugin.ts` to re-export the new plugin contract:

```ts
export type {
  BasePlugin,
  DeployResult,
  DownloadResult,
  ElogPlugin,
  FromPlugin,
  ImageUtils,
  Logger,
  PluginContext,
  ToPlugin,
  TransformPlugin,
  WorkflowInfo,
} from '../plugins/types';
```

- [ ] **Step 4: Replace old runtime files with compatibility re-exports**

Modify `packages/elog/src/Graph.ts`:

```ts
export { Graph as default, Graph } from './runtime/Graph';
```

Modify `packages/elog/src/utils/PluginDriver.ts`:

```ts
export { PluginDriver } from '../runtime/PluginDriver';
```

Modify `packages/elog/src/utils/PluginContext.ts`:

```ts
export { createPluginContext as getPluginContext } from '../plugins/context';
```

These re-exports keep internal imports compiling during this refactor. Keep them in place through the end of this plan.

- [ ] **Step 5: Run full test and build**

Run:

```bash
pnpm --filter @elogx-test/elog test
pnpm build
```

Expected: tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add packages/elog/src
git commit -m "refactor: clean old core compatibility shims"
```

## Task 12: Update Documentation and Changeset

**Files:**
- Modify: `AGENTS.md`
- Create: `.changeset/<generated-name>.md`

- [ ] **Step 1: Update AGENTS architecture section**

In `AGENTS.md`, update the architecture section to describe:

```text
Config load/resolve -> WorkflowRunner -> Graph -> PluginDriver -> CacheStore
```

Also update plugin examples to use:

```ts
kind: 'from'
async download(ctx) {}
```

and namespace plugin names such as `from:notion`, `transform:image-local`, and `to:local`.

- [ ] **Step 2: Add changeset**

Run:

```bash
pnpm changeset
```

Select changed public packages:

```text
@elogx-test/elog
@elogx-test/plugin-from-feishu-space
@elogx-test/plugin-from-feishu-wiki
@elogx-test/plugin-from-flowus
@elogx-test/plugin-from-notion
@elogx-test/plugin-from-wolai
@elogx-test/plugin-from-yuque-pwd
@elogx-test/plugin-from-yuque-token
@elogx-test/plugin-image-cos
@elogx-test/plugin-image-github
@elogx-test/plugin-image-local
@elogx-test/plugin-image-oss
@elogx-test/plugin-image-qiniu
@elogx-test/plugin-image-upyun
@elogx-test/plugin-to-confluence
@elogx-test/plugin-to-halo
@elogx-test/plugin-to-local
@elogx-test/plugin-to-wordpress
```

Use a minor bump if treating the explicit plugin contract as a new pre-release API. Use this summary:

```text
Refactor core runtime foundation with explicit plugin contracts, structured workflow results, config resolution, and core tests.
```

- [ ] **Step 3: Run final verification**

Run:

```bash
pnpm exec prettier --check AGENTS.md docs/superpowers/plans/2026-05-16-core-foundation-refactor.md
pnpm test
pnpm build
git diff --check
```

Expected: all commands pass with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md .changeset docs/superpowers/plans/2026-05-16-core-foundation-refactor.md
git commit -m "docs: update core foundation architecture guidance"
```

## Execution Notes

- Prefer one task per commit.
- Do not include `.superpowers/` companion artifacts in commits.
- Keep `playground` directory migration out of this plan unless a compile error makes a local file move unavoidable.
- Provider credential/auth-specific `process.exit()` behavior is outside this plan. Convert only no-op sync-path exits.
- For compile failures not covered by an existing test, first add a focused failing test in the same package, then implement the smallest fix.
