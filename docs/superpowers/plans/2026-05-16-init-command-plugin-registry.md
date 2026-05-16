# Init Command Plugin Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `elog init` into a plugin-registry driven wizard that installs selected plugins
and generates `elog.config.ts`, `.env`, and `.env.example` safely.

**Architecture:** Keep `elog.config.ts` as the only runtime config format. Add an internal official
plugin registry to `@elogx-test/elog`, then split init into focused modules for registry parsing,
schema prompt planning, config generation, package-manager detection, file writing, env files, and
gitignore updates. Move command registration to thin command wrappers while leaving `elog sync`
runtime behavior unchanged.

**Tech Stack:** TypeScript ESM, Commander, Inquirer, Node `fs`/`path`/`child_process`, Vitest,
existing `tsdown` build.

---

## File Structure

Create these files:

- `packages/elog/src/registry/plugins.json`: built-in official plugin registry.
- `packages/elog/src/registry/plugin-registry.schema.json`: JSON Schema for registry authoring.
- `packages/elog/src/commands/init/types.ts`: init-specific type contracts.
- `packages/elog/src/commands/init/registry.ts`: parse and validate `plugins.json`.
- `packages/elog/src/commands/init/registry.test.ts`: registry validation tests.
- `packages/elog/src/commands/init/generator.ts`: generate `elog.config.ts`, `.env`, and
  `.env.example` content from selected plugins and answers.
- `packages/elog/src/commands/init/generator.test.ts`: generator tests.
- `packages/elog/src/commands/init/package-manager.ts`: detect package manager and build install
  commands.
- `packages/elog/src/commands/init/package-manager.test.ts`: package-manager tests.
- `packages/elog/src/commands/init/file-writer.ts`: ask/backup/write generated target files.
- `packages/elog/src/commands/init/file-writer.test.ts`: file writer tests.
- `packages/elog/src/commands/init/gitignore.ts`: detect and append `.env` ignore entries.
- `packages/elog/src/commands/init/gitignore.test.ts`: gitignore tests.
- `packages/elog/src/commands/init/wizard.ts`: turn registry entries into Inquirer questions and
  collect an `InitSelection`.
- `packages/elog/src/commands/init/wizard.test.ts`: prompt planning tests.
- `packages/elog/src/commands/init/command.ts`: init command orchestration.
- `packages/elog/src/commands/init/index.ts`: init command export.
- `packages/elog/src/commands/init/command.test.ts`: dry-run orchestration smoke tests.
- `packages/elog/src/commands/sync/command.ts`: moved sync implementation.
- `packages/elog/src/commands/sync/format.ts`: moved workflow result formatting.
- `packages/elog/src/commands/sync/index.ts`: sync command export.

Modify these files:

- `packages/elog/src/cli.ts`: register command modules and centralize async error handling.
- `packages/elog/src/commands/sync.test.ts`: update imports after sync split.
- `packages/elog/src/commands/init.ts`: delete after new init directory replaces it.
- `packages/elog/src/commands/init-config.ts`: delete after generator replaces it.
- `packages/elog/tsdown.config.ts`: ensure JSON registry files are copied or importable in dist.

---

### Task 1: Registry Types, Registry JSON, And Validation

**Files:**

- Create: `packages/elog/src/registry/plugins.json`
- Create: `packages/elog/src/registry/plugin-registry.schema.json`
- Create: `packages/elog/src/commands/init/types.ts`
- Create: `packages/elog/src/commands/init/registry.ts`
- Create: `packages/elog/src/commands/init/registry.test.ts`

- [ ] **Step 1: Write failing registry tests**

Create `packages/elog/src/commands/init/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getPluginsByKind, parsePluginRegistry } from './registry';

describe('parsePluginRegistry', () => {
  it('accepts official plugin registry entries', () => {
    const registry = parsePluginRegistry({
      schemaVersion: 1,
      plugins: [
        {
          kind: 'from',
          type: 'yuque-token',
          displayName: '语雀',
          packageName: '@elogx-test/plugin-from-yuque-token',
          importName: 'fromYuque',
          optionsSchema: {
            type: 'object',
            required: ['token'],
            properties: {
              token: {
                type: 'string',
                title: '语雀 Token',
                'x-elog-env': 'YUQUE_TOKEN',
                'x-elog-secret': true,
                'x-elog-prompt': {
                  type: 'password',
                  message: '请输入语雀 Token',
                },
              },
            },
            additionalProperties: false,
          },
        },
      ],
    });

    expect(registry.plugins[0]).toMatchObject({
      kind: 'from',
      type: 'yuque-token',
      packageName: '@elogx-test/plugin-from-yuque-token',
    });
  });

  it('rejects duplicate kind and type pairs', () => {
    expect(() =>
      parsePluginRegistry({
        schemaVersion: 1,
        plugins: [
          {
            kind: 'to',
            type: 'local',
            displayName: '本地目录',
            packageName: '@elogx-test/plugin-to-local',
            importName: 'toLocal',
            optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
          },
          {
            kind: 'to',
            type: 'local',
            displayName: '本地目录',
            packageName: '@elogx-test/plugin-to-local',
            importName: 'toLocal',
            optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
          },
        ],
      }),
    ).toThrow('Duplicate plugin registry entry "to:local".');
  });

  it('filters plugins by kind', () => {
    const registry = parsePluginRegistry({
      schemaVersion: 1,
      plugins: [
        {
          kind: 'from',
          type: 'notion',
          displayName: 'Notion',
          packageName: '@elogx-test/plugin-from-notion',
          importName: 'fromNotion',
          optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
        },
        {
          kind: 'to',
          type: 'local',
          displayName: '本地目录',
          packageName: '@elogx-test/plugin-to-local',
          importName: 'toLocal',
          optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
        },
      ],
    });

    expect(getPluginsByKind(registry, 'to')).toHaveLength(1);
    expect(getPluginsByKind(registry, 'to')[0]?.type).toBe('local');
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/registry.test.ts
```

Expected: FAIL because `./registry` does not exist.

- [ ] **Step 3: Add init types**

Create `packages/elog/src/commands/init/types.ts`:

```ts
export type PluginKind = 'from' | 'to' | 'transform';

export type JsonSchemaPrimitiveType = 'object' | 'string' | 'number' | 'boolean' | 'array';

export interface ElogPromptMetadata {
  type?: 'input' | 'password' | 'confirm' | 'number' | 'list' | 'checkbox';
  message?: string;
  choices?: string[];
}

export interface ElogOptionSchema {
  type: JsonSchemaPrimitiveType;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, ElogOptionSchema>;
  items?: ElogOptionSchema;
  additionalProperties?: boolean;
  'x-elog-env'?: string;
  'x-elog-secret'?: boolean;
  'x-elog-prompt'?: ElogPromptMetadata;
  'x-elog-hidden'?: boolean;
}

export interface PluginRegistryEntry {
  kind: PluginKind;
  type: string;
  displayName: string;
  packageName: string;
  importName: string;
  optionsSchema: ElogOptionSchema;
}

export interface PluginRegistry {
  schemaVersion: 1;
  plugins: PluginRegistryEntry[];
}

export interface SelectedPlugin {
  entry: PluginRegistryEntry;
  answers: Record<string, unknown>;
}

export interface InitSelection {
  from: SelectedPlugin;
  transforms: SelectedPlugin[];
  to: SelectedPlugin[];
}

export interface GeneratedInitFiles {
  configText: string;
  envText: string;
  envExampleText: string;
}

export interface InitErrorOptions {
  code: string;
  message: string;
}
```

- [ ] **Step 4: Implement registry parsing**

Create `packages/elog/src/commands/init/registry.ts`:

```ts
import builtInRegistry from '../../registry/plugins.json' with { type: 'json' };
import type { PluginKind, PluginRegistry, PluginRegistryEntry } from './types';

export class InitCommandError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'InitCommandError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be a non-empty string.`);
  }
}

function assertPluginKind(value: unknown, path: string): asserts value is PluginKind {
  if (value !== 'from' && value !== 'to' && value !== 'transform') {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be from, to, or transform.`);
  }
}

function assertOptionSchema(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be an object.`);
  }
  assertString(value.type, `${path}.type`);
  if (value.type === 'object' && value.properties !== undefined && !isRecord(value.properties)) {
    throw new InitCommandError('REGISTRY_INVALID', `${path}.properties must be an object.`);
  }
}

function parseEntry(value: unknown, index: number): PluginRegistryEntry {
  const path = `plugins[${index}]`;
  if (!isRecord(value)) {
    throw new InitCommandError('REGISTRY_INVALID', `${path} must be an object.`);
  }

  assertPluginKind(value.kind, `${path}.kind`);
  assertString(value.type, `${path}.type`);
  assertString(value.displayName, `${path}.displayName`);
  assertString(value.packageName, `${path}.packageName`);
  assertString(value.importName, `${path}.importName`);
  assertOptionSchema(value.optionsSchema, `${path}.optionsSchema`);

  return value as unknown as PluginRegistryEntry;
}

export function parsePluginRegistry(raw: unknown): PluginRegistry {
  if (!isRecord(raw)) {
    throw new InitCommandError('REGISTRY_INVALID', 'Plugin registry must be an object.');
  }
  if (raw.schemaVersion !== 1) {
    throw new InitCommandError('REGISTRY_INVALID', 'Plugin registry schemaVersion must be 1.');
  }
  if (!Array.isArray(raw.plugins)) {
    throw new InitCommandError('REGISTRY_INVALID', 'Plugin registry plugins must be an array.');
  }

  const seen = new Set<string>();
  const plugins = raw.plugins.map((entry, index) => {
    const parsed = parseEntry(entry, index);
    const key = `${parsed.kind}:${parsed.type}`;
    if (seen.has(key)) {
      throw new InitCommandError('REGISTRY_INVALID', `Duplicate plugin registry entry "${key}".`);
    }
    seen.add(key);
    return parsed;
  });

  return { schemaVersion: 1, plugins };
}

export function loadBuiltInPluginRegistry(): PluginRegistry {
  return parsePluginRegistry(builtInRegistry);
}

export function getPluginsByKind(
  registry: PluginRegistry,
  kind: PluginKind,
): PluginRegistryEntry[] {
  return registry.plugins.filter((plugin) => plugin.kind === kind);
}
```

- [ ] **Step 5: Add registry JSON and schema**

Create `packages/elog/src/registry/plugins.json` with the first three useful entries:

```json
{
  "$schema": "./plugin-registry.schema.json",
  "schemaVersion": 1,
  "plugins": [
    {
      "kind": "from",
      "type": "yuque-token",
      "displayName": "语雀",
      "packageName": "@elogx-test/plugin-from-yuque-token",
      "importName": "fromYuque",
      "optionsSchema": {
        "type": "object",
        "required": ["token", "login", "repo"],
        "properties": {
          "token": {
            "type": "string",
            "title": "语雀 Token",
            "x-elog-env": "YUQUE_TOKEN",
            "x-elog-secret": true,
            "x-elog-prompt": {
              "type": "password",
              "message": "请输入语雀 Token"
            }
          },
          "login": {
            "type": "string",
            "title": "语雀用户名",
            "x-elog-env": "YUQUE_LOGIN",
            "x-elog-prompt": {
              "type": "input",
              "message": "请输入语雀用户名"
            }
          },
          "repo": {
            "type": "string",
            "title": "语雀知识库路径",
            "x-elog-env": "YUQUE_REPO",
            "x-elog-prompt": {
              "type": "input",
              "message": "请输入语雀知识库路径"
            }
          },
          "onlyPublic": {
            "type": "boolean",
            "title": "只同步公开文章",
            "default": false,
            "x-elog-prompt": {
              "type": "confirm",
              "message": "是否只同步公开文章？"
            }
          }
        },
        "additionalProperties": false
      }
    },
    {
      "kind": "transform",
      "type": "image-local",
      "displayName": "下载图片到本地",
      "packageName": "@elogx-test/plugin-image-local",
      "importName": "imageLocal",
      "optionsSchema": {
        "type": "object",
        "required": ["outputDir"],
        "properties": {
          "outputDir": {
            "type": "string",
            "title": "图片输出目录",
            "default": "./images",
            "x-elog-prompt": {
              "type": "input",
              "message": "请输入图片输出目录"
            }
          },
          "prefixKey": {
            "type": "string",
            "title": "图片访问前缀",
            "default": "../../images",
            "x-elog-prompt": {
              "type": "input",
              "message": "请输入图片访问前缀"
            }
          }
        },
        "additionalProperties": false
      }
    },
    {
      "kind": "to",
      "type": "local",
      "displayName": "本地目录",
      "packageName": "@elogx-test/plugin-to-local",
      "importName": "toLocal",
      "optionsSchema": {
        "type": "object",
        "required": ["outputDir"],
        "properties": {
          "outputDir": {
            "type": "string",
            "title": "文档输出目录",
            "default": "./docs",
            "x-elog-prompt": {
              "type": "input",
              "message": "请输入文档输出目录"
            }
          },
          "keepToc": {
            "type": "boolean",
            "title": "保持目录结构",
            "default": true,
            "x-elog-prompt": {
              "type": "confirm",
              "message": "是否保持原有目录结构？"
            }
          }
        },
        "additionalProperties": false
      }
    }
  ]
}
```

Create `packages/elog/src/registry/plugin-registry.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://elog.1874.cool/schemas/plugin-registry.schema.json",
  "type": "object",
  "required": ["schemaVersion", "plugins"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "plugins": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["kind", "type", "displayName", "packageName", "importName", "optionsSchema"],
        "properties": {
          "kind": { "enum": ["from", "to", "transform"] },
          "type": { "type": "string" },
          "displayName": { "type": "string" },
          "packageName": { "type": "string" },
          "importName": { "type": "string" },
          "optionsSchema": { "type": "object" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 6: Run registry tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/registry.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit registry task**

Run:

```bash
git add packages/elog/src/registry packages/elog/src/commands/init/types.ts packages/elog/src/commands/init/registry.ts packages/elog/src/commands/init/registry.test.ts
git commit -m "feat: add init plugin registry"
```

---

### Task 2: Config And Env Generator

**Files:**

- Create: `packages/elog/src/commands/init/generator.ts`
- Create: `packages/elog/src/commands/init/generator.test.ts`

- [ ] **Step 1: Write failing generator tests**

Create `packages/elog/src/commands/init/generator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateInitFiles, renderEnvText, renderObjectLiteral } from './generator';
import type { InitSelection, PluginRegistryEntry } from './types';

const fromYuque: PluginRegistryEntry = {
  kind: 'from',
  type: 'yuque-token',
  displayName: '语雀',
  packageName: '@elogx-test/plugin-from-yuque-token',
  importName: 'fromYuque',
  optionsSchema: {
    type: 'object',
    properties: {
      token: { type: 'string', 'x-elog-env': 'YUQUE_TOKEN', 'x-elog-secret': true },
      login: { type: 'string', 'x-elog-env': 'YUQUE_LOGIN' },
      onlyPublic: { type: 'boolean', default: false },
    },
    additionalProperties: false,
  },
};

const imageLocal: PluginRegistryEntry = {
  kind: 'transform',
  type: 'image-local',
  displayName: '下载图片到本地',
  packageName: '@elogx-test/plugin-image-local',
  importName: 'imageLocal',
  optionsSchema: {
    type: 'object',
    properties: {
      outputDir: { type: 'string', default: './images' },
    },
    additionalProperties: false,
  },
};

const toLocal: PluginRegistryEntry = {
  kind: 'to',
  type: 'local',
  displayName: '本地目录',
  packageName: '@elogx-test/plugin-to-local',
  importName: 'toLocal',
  optionsSchema: {
    type: 'object',
    properties: {
      outputDir: { type: 'string', default: './docs' },
      keepToc: { type: 'boolean', default: true },
    },
    additionalProperties: false,
  },
};

describe('renderObjectLiteral', () => {
  it('renders env references and literal values', () => {
    expect(
      renderObjectLiteral(
        {
          token: 'secret',
          login: '1874',
          onlyPublic: false,
        },
        fromYuque.optionsSchema,
      ),
    ).toBe(`{
    token: process.env.YUQUE_TOKEN,
    login: process.env.YUQUE_LOGIN,
    onlyPublic: false,
  }`);
  });
});

describe('renderEnvText', () => {
  it('renders env values and examples with stable ordering', () => {
    expect(
      renderEnvText([
        { name: 'YUQUE_TOKEN', value: 'secret' },
        { name: 'YUQUE_LOGIN', value: '1874' },
      ]),
    ).toBe('YUQUE_TOKEN=secret\\nYUQUE_LOGIN=1874\\n');
  });
});

describe('generateInitFiles', () => {
  it('generates config, env, and env example text', () => {
    const selection: InitSelection = {
      from: {
        entry: fromYuque,
        answers: { token: 'secret', login: '1874', onlyPublic: false },
      },
      transforms: [{ entry: imageLocal, answers: { outputDir: './images' } }],
      to: [{ entry: toLocal, answers: { outputDir: './docs', keepToc: true } }],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).toContain(
      "import fromYuque from '@elogx-test/plugin-from-yuque-token';",
    );
    expect(files.configText).toContain('token: process.env.YUQUE_TOKEN');
    expect(files.configText).toContain('plugins: [');
    expect(files.configText).toContain('to: toLocal(');
    expect(files.envText).toBe('YUQUE_TOKEN=secret\\nYUQUE_LOGIN=1874\\n');
    expect(files.envExampleText).toBe('YUQUE_TOKEN=\\nYUQUE_LOGIN=\\n');
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/generator.test.ts
```

Expected: FAIL because `./generator` does not exist.

- [ ] **Step 3: Implement generator**

Create `packages/elog/src/commands/init/generator.ts`:

```ts
import type {
  ElogOptionSchema,
  GeneratedInitFiles,
  InitSelection,
  PluginRegistryEntry,
  SelectedPlugin,
} from './types';

export interface EnvValue {
  name: string;
  value: string;
}

function indent(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : line))
    .join('\n');
}

function quoteString(value: string): string {
  return JSON.stringify(value).replace(/"/g, "'");
}

function renderLiteral(value: unknown): string {
  if (typeof value === 'string') {
    return quoteString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(renderLiteral).join(', ')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${renderLiteral(entryValue)}`)
      .join(', ');
    return `{ ${entries} }`;
  }
  return 'undefined';
}

function collectProperties(schema: ElogOptionSchema): Record<string, ElogOptionSchema> {
  return schema.type === 'object' && schema.properties ? schema.properties : {};
}

export function renderObjectLiteral(
  answers: Record<string, unknown>,
  schema: ElogOptionSchema,
): string {
  const properties = collectProperties(schema);
  const lines = Object.entries(properties).flatMap(([key, property]) => {
    const value = answers[key] ?? property.default;
    if (value === undefined) {
      return [];
    }
    if (property['x-elog-env']) {
      return [`  ${key}: process.env.${property['x-elog-env']},`];
    }
    return [`  ${key}: ${renderLiteral(value)},`];
  });

  if (lines.length === 0) {
    return '{}';
  }

  return ['{', ...lines, '}'].join('\n');
}

function renderPluginCall(plugin: SelectedPlugin): string {
  return `${plugin.entry.importName}(${renderObjectLiteral(plugin.answers, plugin.entry.optionsSchema)})`;
}

function uniquePlugins(selection: InitSelection): PluginRegistryEntry[] {
  const plugins = [selection.from, ...selection.transforms, ...selection.to].map((plugin) => plugin.entry);
  const seen = new Set<string>();
  return plugins.filter((plugin) => {
    if (seen.has(plugin.packageName)) {
      return false;
    }
    seen.add(plugin.packageName);
    return true;
  });
}

export function collectEnvValues(selection: InitSelection): EnvValue[] {
  const selected = [selection.from, ...selection.transforms, ...selection.to];
  const values: EnvValue[] = [];

  for (const plugin of selected) {
    for (const [key, property] of Object.entries(collectProperties(plugin.entry.optionsSchema))) {
      const envName = property['x-elog-env'];
      if (!envName) {
        continue;
      }
      const value = plugin.answers[key];
      values.push({ name: envName, value: value === undefined ? '' : String(value) });
    }
  }

  return values;
}

export function renderEnvText(values: EnvValue[], includeValues = true): string {
  return values
    .map((entry) => `${entry.name}=${includeValues ? entry.value : ''}`)
    .join('\n')
    .concat(values.length ? '\n' : '');
}

export function generateInitFiles(selection: InitSelection): GeneratedInitFiles {
  const imports = [
    "import { defineConfig } from '@elogx-test/elog';",
    ...uniquePlugins(selection).map(
      (plugin) => `import ${plugin.importName} from '${plugin.packageName}';`,
    ),
  ];
  const transformLines = selection.transforms.map((plugin) => indent(renderPluginCall(plugin), 4));
  const toValue =
    selection.to.length === 1
      ? renderPluginCall(selection.to[0]!)
      : `[\n${selection.to.map((plugin) => indent(renderPluginCall(plugin), 4)).join(',\n')}\n  ]`;
  const configLines = [
    ...imports,
    '',
    'export default defineConfig({',
    `  from: ${renderPluginCall(selection.from)},`,
  ];

  if (transformLines.length) {
    configLines.push('  plugins: [', transformLines.join(',\n'), '  ],');
  }

  configLines.push(`  to: ${toValue},`, '});', '');

  const envValues = collectEnvValues(selection);

  return {
    configText: configLines.join('\n'),
    envText: renderEnvText(envValues),
    envExampleText: renderEnvText(envValues, false),
  };
}
```

- [ ] **Step 4: Run generator tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/generator.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit generator task**

Run:

```bash
git add packages/elog/src/commands/init/generator.ts packages/elog/src/commands/init/generator.test.ts
git commit -m "feat: generate init config and env files"
```

---

### Task 3: Package Manager Detection And Install Commands

**Files:**

- Create: `packages/elog/src/commands/init/package-manager.ts`
- Create: `packages/elog/src/commands/init/package-manager.test.ts`

- [ ] **Step 1: Write failing package-manager tests**

Create `packages/elog/src/commands/init/package-manager.test.ts`:

```ts
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildInstallCommand, detectPackageManager, installPackages } from './package-manager';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'elog-init-pm-'));
}

describe('detectPackageManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses packageManager from package.json before lockfiles', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.0.0' }));
    fs.writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), '');

    expect(detectPackageManager(cwd)).toBe('yarn');
  });

  it('falls back to pnpm when no package manager signal exists', () => {
    const cwd = makeTempDir();
    expect(detectPackageManager(cwd)).toBe('pnpm');
  });
});

describe('buildInstallCommand', () => {
  it('builds add commands for supported package managers', () => {
    expect(buildInstallCommand('pnpm', ['a', 'b'])).toEqual({
      command: 'pnpm',
      args: ['add', 'a', 'b'],
      display: 'pnpm add a b',
    });
    expect(buildInstallCommand('npm', ['a'])).toEqual({
      command: 'npm',
      args: ['install', 'a'],
      display: 'npm install a',
    });
  });
});

describe('installPackages', () => {
  it('skips duplicate package names', () => {
    const spawnSync = vi.fn(() => ({ status: 0, error: undefined }));
    const result = installPackages({
      cwd: process.cwd(),
      packageManager: 'pnpm',
      packages: ['a', 'a', 'b'],
      spawnSync,
    });

    expect(result.display).toBe('pnpm add a b');
    expect(spawnSync).toHaveBeenCalledWith('pnpm', ['add', 'a', 'b'], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/package-manager.test.ts
```

Expected: FAIL because `./package-manager` does not exist.

- [ ] **Step 3: Implement package-manager module**

Create `packages/elog/src/commands/init/package-manager.ts`:

```ts
import fs from 'fs';
import path from 'path';
import { spawnSync as nodeSpawnSync } from 'child_process';
import { InitCommandError } from './registry';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface InstallCommand {
  command: string;
  args: string[];
  display: string;
}

export interface InstallPackagesOptions {
  cwd: string;
  packageManager: PackageManager;
  packages: string[];
  spawnSync?: typeof nodeSpawnSync;
}

function hasFile(cwd: string, filename: string): boolean {
  return fs.existsSync(path.join(cwd, filename));
}

function readPackageManager(cwd: string): PackageManager | undefined {
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    packageManager?: string;
  };
  const name = packageJson.packageManager?.split('@')[0];
  if (name === 'pnpm' || name === 'npm' || name === 'yarn' || name === 'bun') {
    return name;
  }
  return undefined;
}

export function detectPackageManager(cwd: string): PackageManager {
  return (
    readPackageManager(cwd) ??
    (hasFile(cwd, 'pnpm-lock.yaml')
      ? 'pnpm'
      : hasFile(cwd, 'yarn.lock')
        ? 'yarn'
        : hasFile(cwd, 'package-lock.json')
          ? 'npm'
          : hasFile(cwd, 'bun.lockb') || hasFile(cwd, 'bun.lock')
            ? 'bun'
            : 'pnpm')
  );
}

export function buildInstallCommand(
  packageManager: PackageManager,
  packages: string[],
): InstallCommand {
  const uniquePackages = [...new Set(packages)];
  const args =
    packageManager === 'npm'
      ? ['install', ...uniquePackages]
      : packageManager === 'yarn'
        ? ['add', ...uniquePackages]
        : packageManager === 'bun'
          ? ['add', ...uniquePackages]
          : ['add', ...uniquePackages];
  return {
    command: packageManager,
    args,
    display: [packageManager, ...args].join(' '),
  };
}

export function installPackages(options: InstallPackagesOptions): InstallCommand {
  const installCommand = buildInstallCommand(options.packageManager, options.packages);
  const spawnSync = options.spawnSync ?? nodeSpawnSync;
  const result = spawnSync(installCommand.command, installCommand.args, {
    cwd: options.cwd,
    stdio: 'inherit',
  });

  if (result.error || result.status !== 0) {
    throw new InitCommandError(
      'PACKAGE_INSTALL_FAILED',
      `Package installation failed. Run manually: ${installCommand.display}`,
    );
  }

  return installCommand;
}
```

- [ ] **Step 4: Run package-manager tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/package-manager.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit package-manager task**

Run:

```bash
git add packages/elog/src/commands/init/package-manager.ts packages/elog/src/commands/init/package-manager.test.ts
git commit -m "feat: add init package manager installer"
```

---

### Task 4: File Writer, Backups, Env Files, And Gitignore

**Files:**

- Create: `packages/elog/src/commands/init/file-writer.ts`
- Create: `packages/elog/src/commands/init/file-writer.test.ts`
- Create: `packages/elog/src/commands/init/gitignore.ts`
- Create: `packages/elog/src/commands/init/gitignore.test.ts`

- [ ] **Step 1: Write failing file-writer tests**

Create `packages/elog/src/commands/init/file-writer.test.ts`:

```ts
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { planGeneratedFileWrites, writeGeneratedFiles } from './file-writer';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'elog-init-files-'));
}

describe('planGeneratedFileWrites', () => {
  it('plans backup paths for existing generated files', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');
    fs.writeFileSync(path.join(cwd, '.env'), 'OLD=1');

    const plan = planGeneratedFileWrites({
      cwd,
      configName: 'elog.config.ts',
      files: {
        configText: 'new config',
        envText: 'NEW=1\\n',
        envExampleText: 'NEW=\\n',
      },
      timestamp: '20260516-153012',
    });

    expect(plan.map((item) => path.basename(item.targetPath))).toEqual([
      'elog.config.ts',
      '.env',
      '.env.example',
    ]);
    expect(plan[0]?.backupPath?.endsWith('elog.config.backup.20260516-153012.ts')).toBe(true);
    expect(plan[1]?.backupPath?.endsWith('.env.backup.20260516-153012')).toBe(true);
    expect(plan[2]?.backupPath).toBeUndefined();
  });
});

describe('writeGeneratedFiles', () => {
  it('backs up existing files before writing new files', async () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'OLD=1\\n');

    await writeGeneratedFiles({
      cwd,
      configName: 'elog.config.ts',
      files: {
        configText: 'config',
        envText: 'NEW=1\\n',
        envExampleText: 'NEW=\\n',
      },
      timestamp: '20260516-153012',
      overwriteExisting: () => true,
    });

    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe('NEW=1\\n');
    expect(fs.readFileSync(path.join(cwd, '.env.backup.20260516-153012'), 'utf8')).toBe('OLD=1\\n');
  });

  it('aborts without writing when overwrite is declined', async () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');

    await expect(
      writeGeneratedFiles({
        cwd,
        configName: 'elog.config.ts',
        files: {
          configText: 'new config',
          envText: 'NEW=1\\n',
          envExampleText: 'NEW=\\n',
        },
        timestamp: '20260516-153012',
        overwriteExisting: () => false,
      }),
    ).rejects.toThrow('User declined to overwrite elog.config.ts.');

    expect(fs.readFileSync(path.join(cwd, 'elog.config.ts'), 'utf8')).toBe('old config');
    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing gitignore tests**

Create `packages/elog/src/commands/init/gitignore.test.ts`:

```ts
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { ensureEnvIgnored, isEnvIgnored } from './gitignore';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'elog-init-gitignore-'));
}

describe('isEnvIgnored', () => {
  it('returns true when .env is already ignored', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\\n.env\\n');

    expect(isEnvIgnored(cwd)).toBe(true);
  });

  it('returns false when .gitignore is missing', () => {
    expect(isEnvIgnored(makeTempDir())).toBe(false);
  });
});

describe('ensureEnvIgnored', () => {
  it('appends .env when accepted', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\\n');

    ensureEnvIgnored({ cwd, shouldAdd: () => true });

    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('node_modules\\n.env\\n');
  });

  it('leaves .gitignore unchanged when declined', () => {
    const cwd = makeTempDir();
    fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules\\n');

    ensureEnvIgnored({ cwd, shouldAdd: () => false });

    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('node_modules\\n');
  });
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/file-writer.test.ts src/commands/init/gitignore.test.ts
```

Expected: FAIL because `file-writer` and `gitignore` do not exist.

- [ ] **Step 4: Implement file writer**

Create `packages/elog/src/commands/init/file-writer.ts`:

```ts
import fs from 'fs';
import path from 'path';
import { InitCommandError } from './registry';
import type { GeneratedInitFiles } from './types';

export interface GeneratedFileWrite {
  targetPath: string;
  content: string;
  backupPath?: string;
}

export interface PlanGeneratedFileWritesOptions {
  cwd: string;
  configName: string;
  files: GeneratedInitFiles;
  timestamp: string;
}

export interface WriteGeneratedFilesOptions extends PlanGeneratedFileWritesOptions {
  overwriteExisting: (filename: string) => boolean | Promise<boolean>;
}

function backupName(filename: string, timestamp: string): string {
  if (filename === 'elog.config.ts') {
    return `elog.config.backup.${timestamp}.ts`;
  }
  return `${filename}.backup.${timestamp}`;
}

export function planGeneratedFileWrites(
  options: PlanGeneratedFileWritesOptions,
): GeneratedFileWrite[] {
  const targets = [
    { filename: options.configName, content: options.files.configText },
    { filename: '.env', content: options.files.envText },
    { filename: '.env.example', content: options.files.envExampleText },
  ];

  return targets.map((target) => {
    const targetPath = path.join(options.cwd, target.filename);
    return {
      targetPath,
      content: target.content,
      backupPath: fs.existsSync(targetPath)
        ? path.join(options.cwd, backupName(target.filename, options.timestamp))
        : undefined,
    };
  });
}

export async function writeGeneratedFiles(
  options: WriteGeneratedFilesOptions,
): Promise<GeneratedFileWrite[]> {
  const plan = planGeneratedFileWrites(options);

  for (const item of plan) {
    if (!item.backupPath) {
      continue;
    }
    const filename = path.basename(item.targetPath);
    if (!(await options.overwriteExisting(filename))) {
      throw new InitCommandError(
        'CONFIG_EXISTS_ABORTED',
        `User declined to overwrite ${filename}.`,
      );
    }
  }

  try {
    for (const item of plan) {
      if (item.backupPath) {
        fs.copyFileSync(item.targetPath, item.backupPath);
      }
      fs.writeFileSync(item.targetPath, item.content, 'utf8');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new InitCommandError('CONFIG_WRITE_FAILED', message);
  }

  return plan;
}

export function createTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}
```

- [ ] **Step 5: Implement gitignore helper**

Create `packages/elog/src/commands/init/gitignore.ts`:

```ts
import fs from 'fs';
import path from 'path';
import { InitCommandError } from './registry';

export interface EnsureEnvIgnoredOptions {
  cwd: string;
  shouldAdd: () => boolean;
}

function gitignorePath(cwd: string): string {
  return path.join(cwd, '.gitignore');
}

export function isEnvIgnored(cwd: string): boolean {
  const filePath = gitignorePath(cwd);
  if (!fs.existsSync(filePath)) {
    return false;
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === '.env' || line === '*.env');
}

export function ensureEnvIgnored(options: EnsureEnvIgnoredOptions): boolean {
  if (isEnvIgnored(options.cwd)) {
    return false;
  }
  if (!options.shouldAdd()) {
    return false;
  }

  try {
    const filePath = gitignorePath(options.cwd);
    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    const separator = current.length === 0 || current.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(filePath, `${current}${separator}.env\n`, 'utf8');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new InitCommandError('GITIGNORE_WRITE_FAILED', message);
  }
}
```

- [ ] **Step 6: Run file and gitignore tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/file-writer.test.ts src/commands/init/gitignore.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit file writing task**

Run:

```bash
git add packages/elog/src/commands/init/file-writer.ts packages/elog/src/commands/init/file-writer.test.ts packages/elog/src/commands/init/gitignore.ts packages/elog/src/commands/init/gitignore.test.ts
git commit -m "feat: add init file safety helpers"
```

---

### Task 5: Wizard Prompt Planning

**Files:**

- Create: `packages/elog/src/commands/init/wizard.ts`
- Create: `packages/elog/src/commands/init/wizard.test.ts`

- [ ] **Step 1: Write failing wizard tests**

Create `packages/elog/src/commands/init/wizard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildOptionQuestions, buildPluginChoice } from './wizard';
import type { PluginRegistryEntry } from './types';

const yuque: PluginRegistryEntry = {
  kind: 'from',
  type: 'yuque-token',
  displayName: '语雀',
  packageName: '@elogx-test/plugin-from-yuque-token',
  importName: 'fromYuque',
  optionsSchema: {
    type: 'object',
    required: ['token'],
    properties: {
      token: {
        type: 'string',
        title: '语雀 Token',
        'x-elog-env': 'YUQUE_TOKEN',
        'x-elog-secret': true,
        'x-elog-prompt': { type: 'password', message: '请输入语雀 Token' },
      },
      onlyPublic: {
        type: 'boolean',
        default: false,
        'x-elog-prompt': { type: 'confirm', message: '是否只同步公开文章？' },
      },
      hiddenValue: {
        type: 'string',
        default: 'hidden',
        'x-elog-hidden': true,
      },
    },
    additionalProperties: false,
  },
};

describe('buildPluginChoice', () => {
  it('builds an inquirer choice from a plugin entry', () => {
    expect(buildPluginChoice(yuque)).toEqual({
      name: '语雀',
      value: 'yuque-token',
    });
  });
});

describe('buildOptionQuestions', () => {
  it('builds questions from schema properties', () => {
    expect(buildOptionQuestions(yuque)).toEqual([
      {
        type: 'password',
        name: 'token',
        message: '请输入语雀 Token',
        default: undefined,
      },
      {
        type: 'confirm',
        name: 'onlyPublic',
        message: '是否只同步公开文章？',
        default: false,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/wizard.test.ts
```

Expected: FAIL because `./wizard` does not exist.

- [ ] **Step 3: Implement prompt planning and interactive collection**

Create `packages/elog/src/commands/init/wizard.ts`:

```ts
import inquirer from 'inquirer';
import { getPluginsByKind } from './registry';
import type {
  ElogOptionSchema,
  InitSelection,
  PluginRegistry,
  PluginRegistryEntry,
  SelectedPlugin,
} from './types';

export interface InquirerQuestion {
  type: string;
  name: string;
  message: string;
  default?: unknown;
  choices?: Array<{ name: string; value: string }> | string[];
}

export function buildPluginChoice(entry: PluginRegistryEntry): { name: string; value: string } {
  return { name: entry.displayName, value: entry.type };
}

function promptType(schema: ElogOptionSchema): string {
  if (schema['x-elog-prompt']?.type) {
    return schema['x-elog-prompt'].type;
  }
  if (schema.enum) {
    return 'list';
  }
  if (schema.type === 'boolean') {
    return 'confirm';
  }
  if (schema.type === 'number') {
    return 'number';
  }
  return schema['x-elog-secret'] ? 'password' : 'input';
}

export function buildOptionQuestions(entry: PluginRegistryEntry): InquirerQuestion[] {
  const properties = entry.optionsSchema.properties ?? {};
  return Object.entries(properties).flatMap(([name, schema]) => {
    if (schema['x-elog-hidden']) {
      return [];
    }
    const prompt = schema['x-elog-prompt'];
    return [
      {
        type: promptType(schema),
        name,
        message: prompt?.message ?? schema.title ?? name,
        default: schema.default,
        ...(schema.enum ? { choices: schema.enum.map(String) } : {}),
      },
    ];
  });
}

function findPlugin(registry: PluginRegistry, kind: PluginRegistryEntry['kind'], type: string) {
  return getPluginsByKind(registry, kind).find((plugin) => plugin.type === type);
}

function withHiddenDefaults(entry: PluginRegistryEntry, answers: Record<string, unknown>) {
  const properties = entry.optionsSchema.properties ?? {};
  return Object.fromEntries(
    Object.entries(properties)
      .map(([key, schema]) => [key, answers[key] ?? schema.default])
      .filter(([, value]) => value !== undefined),
  );
}

async function askPluginOptions(entry: PluginRegistryEntry): Promise<SelectedPlugin> {
  const answers = (await inquirer.prompt(buildOptionQuestions(entry))) as Record<string, unknown>;
  return { entry, answers: withHiddenDefaults(entry, answers) };
}

export async function runInitWizard(registry: PluginRegistry): Promise<InitSelection> {
  const fromAnswer = (await inquirer.prompt([
    {
      type: 'list',
      name: 'from',
      message: '你在哪里写文章？',
      choices: getPluginsByKind(registry, 'from').map(buildPluginChoice),
    },
  ])) as { from: string };
  const fromEntry = findPlugin(registry, 'from', fromAnswer.from);

  const toAnswer = (await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'to',
      message: '你要发布到哪里？',
      choices: getPluginsByKind(registry, 'to').map(buildPluginChoice),
    },
  ])) as { to: string[] };
  const toEntries = toAnswer.to.flatMap((type) => {
    const entry = findPlugin(registry, 'to', type);
    return entry ? [entry] : [];
  });

  const transformAnswer = (await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'transforms',
      message: '是否处理图片？',
      choices: getPluginsByKind(registry, 'transform').map(buildPluginChoice),
    },
  ])) as { transforms: string[] };
  const transformEntries = transformAnswer.transforms.flatMap((type) => {
    const entry = findPlugin(registry, 'transform', type);
    return entry ? [entry] : [];
  });

  if (!fromEntry || toEntries.length === 0) {
    throw new Error('PLUGIN_SELECTION_EMPTY');
  }

  return {
    from: await askPluginOptions(fromEntry),
    transforms: await Promise.all(transformEntries.map(askPluginOptions)),
    to: await Promise.all(toEntries.map(askPluginOptions)),
  };
}
```

- [ ] **Step 4: Run wizard tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/wizard.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit wizard task**

Run:

```bash
git add packages/elog/src/commands/init/wizard.ts packages/elog/src/commands/init/wizard.test.ts
git commit -m "feat: add init wizard prompt planning"
```

---

### Task 6: Init Command Orchestration And Dry Run

**Files:**

- Create: `packages/elog/src/commands/init/command.ts`
- Create: `packages/elog/src/commands/init/index.ts`
- Create: `packages/elog/src/commands/init/command.test.ts`
- Delete after replacement: `packages/elog/src/commands/init.ts`
- Delete after replacement: `packages/elog/src/commands/init-config.ts`

- [ ] **Step 1: Write failing orchestration tests**

Create `packages/elog/src/commands/init/command.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createInitDryRunOutput, runInitCommand } from './command';
import type { InitSelection } from './types';

const selection: InitSelection = {
  from: {
    entry: {
      kind: 'from',
      type: 'yuque-token',
      displayName: '语雀',
      packageName: '@elogx-test/plugin-from-yuque-token',
      importName: 'fromYuque',
      optionsSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', 'x-elog-env': 'YUQUE_TOKEN', 'x-elog-secret': true },
        },
      },
    },
    answers: { token: 'secret' },
  },
  transforms: [],
  to: [
    {
      entry: {
        kind: 'to',
        type: 'local',
        displayName: '本地目录',
        packageName: '@elogx-test/plugin-to-local',
        importName: 'toLocal',
        optionsSchema: {
          type: 'object',
          properties: {
            outputDir: { type: 'string', default: './docs' },
          },
        },
      },
      answers: { outputDir: './docs' },
    },
  ],
};

describe('createInitDryRunOutput', () => {
  it('redacts env values in dry-run output', () => {
    const output = createInitDryRunOutput({
      installCommand: 'pnpm add @elogx-test/plugin-from-yuque-token @elogx-test/plugin-to-local',
      configText: 'config',
      envText: 'YUQUE_TOKEN=secret\\n',
      envExampleText: 'YUQUE_TOKEN=\\n',
    });

    expect(output).toContain('YUQUE_TOKEN=<redacted>');
    expect(output).not.toContain('secret');
  });
});

describe('runInitCommand', () => {
  it('does not install or write files during dry run', async () => {
    const installPackages = vi.fn();
    const writeGeneratedFiles = vi.fn();

    await runInitCommand({
      cwd: process.cwd(),
      configName: 'elog.config.ts',
      dryRun: true,
      loadRegistry: () => ({
        schemaVersion: 1,
        plugins: [selection.from.entry, selection.to[0]!.entry],
      }),
      runWizard: async () => selection,
      installPackages,
      writeGeneratedFiles,
      ensureEnvIgnored: vi.fn(),
      log: vi.fn(),
    });

    expect(installPackages).not.toHaveBeenCalled();
    expect(writeGeneratedFiles).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/command.test.ts
```

Expected: FAIL because `./command` does not exist.

- [ ] **Step 3: Implement init orchestration**

Create `packages/elog/src/commands/init/command.ts`:

```ts
import inquirer from 'inquirer';
import out from '../../logging/logger';
import { generateInitFiles } from './generator';
import { ensureEnvIgnored } from './gitignore';
import { createTimestamp, writeGeneratedFiles } from './file-writer';
import { detectPackageManager, installPackages } from './package-manager';
import { loadBuiltInPluginRegistry } from './registry';
import { runInitWizard } from './wizard';
import type { GeneratedInitFiles, InitSelection, PluginRegistry } from './types';

export interface RunInitCommandOptions {
  cwd: string;
  configName: string;
  dryRun: boolean;
  loadRegistry?: () => PluginRegistry;
  runWizard?: (registry: PluginRegistry) => Promise<InitSelection>;
  installPackages?: typeof installPackages;
  writeGeneratedFiles?: typeof writeGeneratedFiles;
  ensureEnvIgnored?: typeof ensureEnvIgnored;
  log?: (message: string) => void;
}

function selectedPackages(selection: InitSelection): string[] {
  return [
    selection.from.entry.packageName,
    ...selection.transforms.map((plugin) => plugin.entry.packageName),
    ...selection.to.map((plugin) => plugin.entry.packageName),
  ];
}

function redactEnvText(envText: string): string {
  return envText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `${line.split('=')[0]}=<redacted>`)
    .join('\n')
    .concat(envText.trim() ? '\n' : '');
}

export function createInitDryRunOutput(
  files: GeneratedInitFiles & { installCommand: string },
): string {
  return [
    'Install command:',
    files.installCommand,
    '',
    'elog.config.ts:',
    files.configText,
    '.env:',
    redactEnvText(files.envText),
    '.env.example:',
    files.envExampleText,
  ].join('\n');
}

async function confirmOverwrite(filename: string): Promise<boolean> {
  const answer = (await inquirer.prompt([
    {
      type: 'confirm',
      name: 'overwrite',
      message: `检测到已有 ${filename}，是否覆写？旧文件会自动备份`,
      default: true,
    },
  ])) as { overwrite: boolean };
  return answer.overwrite;
}

export async function runInitCommand(options: RunInitCommandOptions): Promise<void> {
  const loadRegistry = options.loadRegistry ?? loadBuiltInPluginRegistry;
  const runWizard = options.runWizard ?? runInitWizard;
  const install = options.installPackages ?? installPackages;
  const writeFiles = options.writeGeneratedFiles ?? writeGeneratedFiles;
  const updateGitignore = options.ensureEnvIgnored ?? ensureEnvIgnored;
  const log = options.log ?? ((message: string) => out.info('初始化', message));

  const registry = loadRegistry();
  const selection = await runWizard(registry);
  const files = generateInitFiles(selection);
  const packageManager = detectPackageManager(options.cwd);
  const packages = selectedPackages(selection);
  const installCommand = `${packageManager} ${packageManager === 'npm' ? 'install' : 'add'} ${[
    ...new Set(packages),
  ].join(' ')}`;

  if (options.dryRun) {
    log(createInitDryRunOutput({ ...files, installCommand }));
    return;
  }

  install({ cwd: options.cwd, packageManager, packages });
  await writeFiles({
    cwd: options.cwd,
    configName: options.configName,
    files,
    timestamp: createTimestamp(),
    overwriteExisting: confirmOverwrite,
  });
  updateGitignore({
    cwd: options.cwd,
    shouldAdd: () => {
      out.warn('.env 包含敏感信息，请不要提交到 GitHub');
      return true;
    },
  });
}
```

Create `packages/elog/src/commands/init/index.ts`:

```ts
export { runInitCommand } from './command';
```

- [ ] **Step 4: Remove obsolete init files**

Run:

```bash
git rm packages/elog/src/commands/init.ts packages/elog/src/commands/init-config.ts
```

Expected: both files are staged for deletion.

- [ ] **Step 5: Run init command tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/command.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit init command task**

Run:

```bash
git add packages/elog/src/commands/init packages/elog/src/commands/init.ts packages/elog/src/commands/init-config.ts
git commit -m "feat: orchestrate registry driven init"
```

---

### Task 7: Sync Command Move And CLI Registration

**Files:**

- Create: `packages/elog/src/commands/sync/format.ts`
- Create: `packages/elog/src/commands/sync/command.ts`
- Create: `packages/elog/src/commands/sync/index.ts`
- Modify: `packages/elog/src/commands/sync.test.ts`
- Modify: `packages/elog/src/cli.ts`
- Delete after replacement: `packages/elog/src/commands/sync.ts`

- [ ] **Step 1: Move sync formatting test import**

Modify `packages/elog/src/commands/sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatWorkflowResults } from './sync/format';
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

- [ ] **Step 2: Run sync test and verify it fails**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/sync.test.ts
```

Expected: FAIL because `./sync/format` does not exist.

- [ ] **Step 3: Create sync modules**

Create `packages/elog/src/commands/sync/format.ts`:

```ts
import type { WorkflowResult } from '../../runtime/types';

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
```

Create `packages/elog/src/commands/sync/command.ts` by moving the current sync behavior:

```ts
import path from 'path';
import dotenv from 'dotenv';
import { findConfig } from '../../config/find';
import elog from '../../node-entry';
import out from '../../logging/logger';
import type { WorkflowResult } from '../../runtime/types';
import { formatWorkflowResults } from './format';

type FailedWorkflowResult = Extract<WorkflowResult, { status: 'failed' }>;

function isFailedWorkflowResult(result: WorkflowResult): result is FailedWorkflowResult {
  return result.status === 'failed';
}

export async function runSyncCommand(
  customConfigPath?: string,
  envPath?: string,
  enableDebug?: boolean,
): Promise<void> {
  if (enableDebug) {
    process.env.DEBUG = 'true';
  }

  const rootDir = process.cwd();

  if (envPath) {
    const resolvedEnvPath = path.resolve(rootDir, envPath);
    out.info('环境变量', `已指定读取env文件为：${resolvedEnvPath}`);
    dotenv.config({ override: true, path: resolvedEnvPath });
  } else {
    out.info('环境变量', '未指定env文件，将从系统环境变量中读取');
  }

  const userConfig = await findConfig(customConfigPath);
  const results = await elog(userConfig);

  for (const line of formatWorkflowResults(results)) {
    out.info('同步结果', line);
  }

  const failed = results.find(isFailedWorkflowResult);
  if (failed) {
    out.error(failed.error.message);
  }
}
```

Create `packages/elog/src/commands/sync/index.ts`:

```ts
export { runSyncCommand } from './command';
export { formatWorkflowResults } from './format';
```

- [ ] **Step 4: Update CLI registration**

Modify `packages/elog/src/cli.ts`:

```ts
import { Command } from 'commander';
import { runInitCommand } from './commands/init';
import { runSyncCommand } from './commands/sync';
import out from './logging/logger';
import packageJson from '../package.json' with { type: 'json' };

async function handleAction(action: () => Promise<void> | void): Promise<void> {
  try {
    await action();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    out.error(message);
  }
}

export function createProgram(): Command {
  const program = new Command();

  program.version(packageJson.version);

  program
    .command('init')
    .option('--name <string>', 'custom config name')
    .option('--dry-run', 'print generated output without installing or writing files')
    .description('init config')
    .action((options: { name?: string; dryRun?: boolean }) =>
      handleAction(() =>
        runInitCommand({
          cwd: process.cwd(),
          configName: options.name ?? 'elog.config.ts',
          dryRun: options.dryRun ?? false,
        }),
      ),
    );

  program
    .command('sync')
    .option('-c --config <string>', 'use config with custom, default is elog.config.ts')
    .option('-e, --env <string>', 'use env with custom')
    .option('--debug', 'enable debug')
    .description('sync doc')
    .action((options: { config?: string; env?: string; debug?: boolean }) =>
      handleAction(() => runSyncCommand(options.config, options.env, options.debug)),
    );

  return program;
}

export async function run(): Promise<void> {
  createProgram().parse();
}
```

- [ ] **Step 5: Delete old sync module**

Run:

```bash
git rm packages/elog/src/commands/sync.ts
```

Expected: file is staged for deletion.

- [ ] **Step 6: Run sync and CLI smoke tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/sync.test.ts src/cli-smoke.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit command registration task**

Run:

```bash
git add packages/elog/src/cli.ts packages/elog/src/commands/sync packages/elog/src/commands/sync.test.ts packages/elog/src/commands/sync.ts
git commit -m "refactor: split cli command registration"
```

---

### Task 8: Build Packaging, Full Tests, And Documentation Check

**Files:**

- Modify: `packages/elog/tsdown.config.ts`
- Modify if needed: `packages/elog/package.json`

- [ ] **Step 1: Verify JSON registry packaging behavior**

Run:

```bash
pnpm --filter @elogx-test/elog build
```

Expected: PASS and `packages/elog/dist` contains the registry JSON or a bundled equivalent.

- [ ] **Step 2: If JSON files are missing from dist, update tsdown config**

Modify `packages/elog/tsdown.config.ts`:

```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  sourcemap: true,
  fixedExtension: false,
  copy: [{ from: 'src/registry/*.json', to: 'registry' }],
});
```

If `tsdown` rejects `copy`, use a package script instead:

```json
{
  "scripts": {
    "build": "tsdown && mkdir -p dist/registry && cp src/registry/*.json dist/registry/"
  }
}
```

Keep the `tsdown.config.ts` solution if supported; use the package script fallback only if the
build proves `copy` is unsupported in this project.

- [ ] **Step 3: Run focused init tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init
```

Expected: PASS.

- [ ] **Step 4: Run all core tests**

Run:

```bash
pnpm --filter @elogx-test/elog test
```

Expected: PASS.

- [ ] **Step 5: Run core build**

Run:

```bash
pnpm --filter @elogx-test/elog build
```

Expected: PASS.

- [ ] **Step 6: Run full workspace build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 7: Run full workspace tests**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 8: Commit packaging and verification fixes**

If files changed in this task, run:

```bash
git add packages/elog/tsdown.config.ts packages/elog/package.json
git commit -m "chore: package init registry assets"
```

If no files changed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Built-in official registry: Task 1.
- JSON Schema subset and Elog extension fields: Tasks 1 and 5.
- Interactive init choices: Task 5.
- Package installation: Task 3 and Task 6.
- Config, `.env`, `.env.example` generation: Task 2 and Task 4.
- Existing file overwrite prompts and backups: Task 4.
- `.gitignore` `.env` handling: Task 4.
- Command architecture split: Task 7.
- Dry-run behavior: Task 6.
- Packaging and verification: Task 8.

Placeholder scan:

- This plan intentionally avoids placeholder markers and includes concrete paths, commands, and
  expected results for each task.

Type consistency:

- Shared init types are introduced in Task 1 and reused by generator, wizard, and command tasks.
- `InitCommandError` is introduced in Task 1 and reused by package manager, file writer, and
  gitignore tasks.
