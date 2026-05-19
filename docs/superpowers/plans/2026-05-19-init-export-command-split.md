# Init Export Command Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `elog init` into a config-only setup flow and add `elog export` as a one-time guided sync flow.

**Architecture:** Reuse the existing plugin registry, prompt builder, package installer, and runtime. Add a light `PluginSelection` type for init, keep answer-bearing selections for export, render init config from schema defaults, and build export runtime config in memory through dynamic plugin imports.

**Tech Stack:** TypeScript ESM, Commander, Inquirer, Vitest, pnpm/Turbo, existing `@elogx-test/elog` runtime APIs.

---

## File Structure

- Modify `packages/elog/src/commands/init/types.ts`: add `PluginSelection`; make generated init output config-only.
- Modify `packages/elog/src/commands/init/wizard.ts`: split plugin selection from option collection.
- Modify `packages/elog/src/commands/init/wizard.test.ts`: cover selection-only init and option-collecting export wizard.
- Modify `packages/elog/src/commands/init/generator.ts`: render config from selected plugins and schema defaults/env references.
- Modify `packages/elog/src/commands/init/generator.test.ts`: replace env file expectations with config-only expectations.
- Modify `packages/elog/src/commands/init/file-writer.ts`: write only the config file.
- Modify `packages/elog/src/commands/init/file-writer.test.ts`: remove `.env`/`.env.example` expectations.
- Modify `packages/elog/src/commands/init/command.ts`: stop collecting plugin options, stop writing env/gitignore, keep package install and config write.
- Modify `packages/elog/src/commands/init/command.test.ts`: update dry-run and write behavior tests.
- Create `packages/elog/src/commands/sync/results.ts`: shared workflow result reporting and failure propagation.
- Modify `packages/elog/src/commands/sync/command.ts`: use shared result helper.
- Create `packages/elog/src/commands/sync/results.test.ts`: verify shared result helper.
- Create `packages/elog/src/commands/export/runtime-config.ts`: import plugin factories and build in-memory `ElogConfig`.
- Create `packages/elog/src/commands/export/runtime-config.test.ts`: test in-memory config behavior and error wrapping.
- Create `packages/elog/src/commands/export/command.ts`: orchestrate export wizard, install, runtime call, and result reporting.
- Create `packages/elog/src/commands/export/command.test.ts`: test export orchestration without file writes.
- Create `packages/elog/src/commands/export/index.ts`: export command runner.
- Modify `packages/elog/src/cli.ts`: register `elog export`.
- Modify `packages/elog/src/cli-smoke.test.ts`: add CLI registration coverage for export.
- Modify `tests/e2e/command-cases/init-dry-run.case.ts`: assert new dry-run output and absence of env output.

---

### Task 1: Split Plugin Selection From Option Collection

**Files:**
- Modify: `packages/elog/src/commands/init/types.ts`
- Modify: `packages/elog/src/commands/init/wizard.ts`
- Modify: `packages/elog/src/commands/init/wizard.test.ts`

- [ ] **Step 1: Write failing wizard tests for selection-only init**

Add these imports at the top of `packages/elog/src/commands/init/wizard.test.ts`:

```ts
import inquirer from 'inquirer';
import type { PluginRegistry } from './types';
```

Add this registry near the existing `yuque` fixture:

```ts
const localTarget: PluginRegistryEntry = {
  kind: 'to',
  type: 'local',
  displayName: '本地目录',
  packageName: '@elogx-test/plugin-to-local',
  importName: 'toLocal',
  optionsSchema: {
    type: 'object',
    properties: {
      outputDir: {
        type: 'string',
        default: './docs',
        'x-elog-prompt': { type: 'input', message: '请输入文档输出目录' },
      },
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
      outputDir: {
        type: 'string',
        default: './images',
        'x-elog-prompt': { type: 'input', message: '请输入图片输出目录' },
      },
    },
    additionalProperties: false,
  },
};

const registry: PluginRegistry = {
  schemaVersion: 1,
  plugins: [yuque, imageLocal, localTarget],
};
```

Add this test block:

```ts
describe('runPluginSelectionWizard', () => {
  it('asks only plugin selection questions and returns selected entries', async () => {
    const prompt = vi.mocked(inquirer.prompt);
    prompt
      .mockResolvedValueOnce({ from: 'yuque-token' })
      .mockResolvedValueOnce({ to: ['local'] })
      .mockResolvedValueOnce({ transforms: ['image-local'] });

    const { runPluginSelectionWizard } = await import('./wizard');
    const selection = await runPluginSelectionWizard(registry);

    expect(selection.from).toBe(yuque);
    expect(selection.transforms).toEqual([imageLocal]);
    expect(selection.to).toEqual([localTarget]);
    expect(prompt).toHaveBeenCalledTimes(3);
    expect(prompt.mock.calls.flatMap((call) => call[0] as unknown[])).not.toContainEqual(
      expect.objectContaining({ name: 'token' }),
    );
  });

  it('throws PLUGIN_SELECTION_EMPTY when no target is selected', async () => {
    const prompt = vi.mocked(inquirer.prompt);
    prompt
      .mockResolvedValueOnce({ from: 'yuque-token' })
      .mockResolvedValueOnce({ to: [] })
      .mockResolvedValueOnce({ transforms: [] });

    const { runPluginSelectionWizard } = await import('./wizard');

    await expect(runPluginSelectionWizard(registry)).rejects.toMatchObject({
      code: 'PLUGIN_SELECTION_EMPTY',
    });
  });
});
```

- [ ] **Step 2: Write failing wizard tests for export option collection**

Add this test block to `packages/elog/src/commands/init/wizard.test.ts`:

```ts
describe('runExportWizard', () => {
  it('selects plugins and then asks selected plugin option questions', async () => {
    const prompt = vi.mocked(inquirer.prompt);
    prompt
      .mockResolvedValueOnce({ from: 'yuque-token' })
      .mockResolvedValueOnce({ to: ['local'] })
      .mockResolvedValueOnce({ transforms: [] })
      .mockResolvedValueOnce({ token: 'secret-token', onlyPublic: true })
      .mockResolvedValueOnce({ outputDir: './exported-docs' });

    const { runExportWizard } = await import('./wizard');
    const selection = await runExportWizard(registry);

    expect(selection.from.entry).toBe(yuque);
    expect(selection.from.answers).toMatchObject({
      token: 'secret-token',
      onlyPublic: true,
      hiddenValue: 'hidden',
    });
    expect(selection.transforms).toEqual([]);
    expect(selection.to[0]?.entry).toBe(localTarget);
    expect(selection.to[0]?.answers).toEqual({ outputDir: './exported-docs' });
    expect(prompt).toHaveBeenCalledTimes(5);
  });
});
```

- [ ] **Step 3: Run wizard tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/wizard.test.ts
```

Expected: FAIL with missing `runPluginSelectionWizard` and `runExportWizard` exports.

- [ ] **Step 4: Add `PluginSelection` type**

In `packages/elog/src/commands/init/types.ts`, add this interface after `SelectedPlugin`:

```ts
export interface PluginSelection {
  from: PluginRegistryEntry;
  transforms: PluginRegistryEntry[];
  to: PluginRegistryEntry[];
}
```

- [ ] **Step 5: Implement selection and export wizard functions**

Replace the bottom half of `packages/elog/src/commands/init/wizard.ts`, starting at `async function askPluginOptions`, with:

```ts
async function askPluginOptions(entry: PluginRegistryEntry): Promise<SelectedPlugin> {
  const answers = (await inquirer.prompt(buildOptionQuestions(entry))) as Record<string, unknown>;
  return { entry, answers: withHiddenDefaults(entry, answers) };
}

export async function runPluginSelectionWizard(registry: PluginRegistry): Promise<PluginSelection> {
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
    throw new InitCommandError(
      'PLUGIN_SELECTION_EMPTY',
      'Must select at least one source and one target plugin.',
    );
  }

  return {
    from: fromEntry,
    transforms: transformEntries,
    to: toEntries,
  };
}

export async function runExportWizard(registry: PluginRegistry): Promise<InitSelection> {
  const selection = await runPluginSelectionWizard(registry);

  return {
    from: await askPluginOptions(selection.from),
    transforms: await Promise.all(selection.transforms.map(askPluginOptions)),
    to: await Promise.all(selection.to.map(askPluginOptions)),
  };
}

export const runInitWizard = runExportWizard;
```

Also update the type import from `./types` to include `PluginSelection`:

```ts
import type {
  ElogOptionSchema,
  InitSelection,
  PluginRegistry,
  PluginRegistryEntry,
  PluginSelection,
  SelectedPlugin,
} from './types';
```

- [ ] **Step 6: Run wizard tests and verify they pass**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/wizard.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit wizard split**

Run:

```bash
git add packages/elog/src/commands/init/types.ts packages/elog/src/commands/init/wizard.ts packages/elog/src/commands/init/wizard.test.ts
git commit -m "refactor: split init plugin selection wizard"
```

---

### Task 2: Render Init Config From Defaults Only

**Files:**
- Modify: `packages/elog/src/commands/init/types.ts`
- Modify: `packages/elog/src/commands/init/generator.ts`
- Modify: `packages/elog/src/commands/init/generator.test.ts`

- [ ] **Step 1: Rewrite generator tests for config-only output**

In `packages/elog/src/commands/init/generator.test.ts`, change the type import to:

```ts
import type { InitSelection, PluginRegistryEntry, PluginSelection } from './types';
```

Add this property to the `fromYuque` fixture:

```ts
repo: { type: 'string', 'x-elog-env': 'YUQUE_REPO' },
```

Add this property to the `fromYuque` fixture to cover omitted fields:

```ts
space: { type: 'string' },
```

Replace the `generateInitFiles` describe block with:

```ts
describe('generateInitFiles', () => {
  it('generates config text from selected plugins and schema defaults', () => {
    const selection: PluginSelection = {
      from: fromYuque,
      transforms: [imageLocal],
      to: [toLocal],
    };

    const files = generateInitFiles(selection);

    expect(files).toEqual({
      configText: `import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-token';
import imageLocal from '@elogx-test/plugin-image-local';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  from: fromYuque({
    token: process.env.YUQUE_TOKEN,
    login: process.env.YUQUE_LOGIN,
    repo: process.env.YUQUE_REPO,
    onlyPublic: false,
  }),
  plugins: [
    imageLocal({
      outputDir: './images',
    }),
  ],
  to: toLocal({
    outputDir: './docs',
    keepToc: true,
  }),
});
`,
    });
    expect(files.configText).not.toContain('space:');
  });

  it('omits plugins key when there are zero transforms', () => {
    const selection: PluginSelection = {
      from: fromYuque,
      transforms: [],
      to: [toLocal],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).not.toContain('plugins:');
    expect(files.configText).toContain('from:');
    expect(files.configText).toContain('to:');
  });

  it('renders multiple to plugins as an array', () => {
    const toHalo: PluginRegistryEntry = {
      kind: 'to',
      type: 'halo',
      displayName: 'Halo',
      packageName: '@elogx-test/plugin-to-halo',
      importName: 'toHalo',
      optionsSchema: {
        type: 'object',
        properties: {
          apiUrl: { type: 'string', 'x-elog-env': 'HALO_API_URL' },
        },
        additionalProperties: false,
      },
    };

    const selection: PluginSelection = {
      from: fromYuque,
      transforms: [],
      to: [toLocal, toHalo],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).toContain('to: [');
    expect(files.configText).toContain('toLocal(');
    expect(files.configText).toContain('toHalo(');
    expect(files.configText).toContain('apiUrl: process.env.HALO_API_URL');
  });
});
```

Leave the existing `renderObjectLiteral` and `renderEnvText` tests in place temporarily; they will fail and guide the implementation.

- [ ] **Step 2: Run generator tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/generator.test.ts
```

Expected: FAIL because `generateInitFiles` still expects answer-bearing selections and returns env output.

- [ ] **Step 3: Make generated init files config-only**

In `packages/elog/src/commands/init/types.ts`, replace `GeneratedInitFiles` with:

```ts
export interface GeneratedInitFiles {
  configText: string;
}
```

- [ ] **Step 4: Add default answer derivation to generator**

In `packages/elog/src/commands/init/generator.ts`, update the type import to include `PluginSelection`:

```ts
import type {
  ElogOptionSchema,
  GeneratedInitFiles,
  InitSelection,
  PluginRegistryEntry,
  PluginSelection,
  SelectedPlugin,
} from './types';
```

Add this function after `collectProperties`:

```ts
function defaultAnswersForEntry(entry: PluginRegistryEntry): Record<string, unknown> {
  const properties = collectProperties(entry.optionsSchema);
  return Object.fromEntries(
    Object.entries(properties)
      .flatMap(([key, property]) => {
        if (property['x-elog-env']) {
          return [[key, undefined]];
        }
        if ('default' in property) {
          return [[key, property.default]];
        }
        return [];
      })
      .filter(([key, value]) => {
        const property = properties[key];
        return property?.['x-elog-env'] || value !== undefined;
      }),
  );
}

function selectedPluginFromEntry(entry: PluginRegistryEntry): SelectedPlugin {
  return {
    entry,
    answers: defaultAnswersForEntry(entry),
  };
}

function normalizeSelection(selection: InitSelection | PluginSelection): InitSelection {
  if ('entry' in selection.from) {
    return selection as InitSelection;
  }

  return {
    from: selectedPluginFromEntry(selection.from),
    transforms: selection.transforms.map(selectedPluginFromEntry),
    to: selection.to.map(selectedPluginFromEntry),
  };
}
```

- [ ] **Step 5: Update config generation and remove env generation**

In `packages/elog/src/commands/init/generator.ts`, replace `generateInitFiles` with:

```ts
export function generateInitFiles(selectionInput: InitSelection | PluginSelection): GeneratedInitFiles {
  const selection = normalizeSelection(selectionInput);
  const imports = [
    "import { defineConfig } from '@elogx-test/elog';",
    ...uniquePlugins(selection).map(
      (plugin) => `import ${plugin.importName} from '${plugin.packageName}';`,
    ),
  ];
  const configLines = [
    ...imports,
    '',
    'export default defineConfig({',
    renderConfigProperty('from', renderPluginCall(selection.from)),
  ];

  if (selection.transforms.length) {
    configLines.push(renderConfigProperty('plugins', renderPluginArray(selection.transforms)));
  }

  const toValue =
    selection.to.length === 1
      ? renderPluginCall(selection.to[0]!)
      : renderPluginArray(selection.to);
  configLines.push(renderConfigProperty('to', toValue), '});', '');

  return {
    configText: configLines.join('\n'),
  };
}
```

Keep `collectEnvValues` and `renderEnvText` exported until their tests are removed in the next step; unused exported functions are acceptable if tests still import them.

- [ ] **Step 6: Remove obsolete env helper tests**

In `packages/elog/src/commands/init/generator.test.ts`, remove `renderEnvText` from the import:

```ts
import { generateInitFiles, renderObjectLiteral } from './generator';
```

Delete the entire `describe('renderEnvText', ...)` block.

- [ ] **Step 7: Run generator tests and verify they pass**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/generator.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit generator change**

Run:

```bash
git add packages/elog/src/commands/init/types.ts packages/elog/src/commands/init/generator.ts packages/elog/src/commands/init/generator.test.ts
git commit -m "refactor: generate init config from defaults"
```

---

### Task 3: Make Init Write Only Config Files

**Files:**
- Modify: `packages/elog/src/commands/init/file-writer.ts`
- Modify: `packages/elog/src/commands/init/file-writer.test.ts`
- Modify: `packages/elog/src/commands/init/command.ts`
- Modify: `packages/elog/src/commands/init/command.test.ts`

- [ ] **Step 1: Update file-writer tests to config-only behavior**

In `packages/elog/src/commands/init/file-writer.test.ts`, replace the first `planGeneratedFileWrites` test with:

```ts
it('plans backup paths only for the generated config file', () => {
  const cwd = makeTempDir();
  fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');
  fs.writeFileSync(path.join(cwd, '.env'), 'OLD=1');

  const plan = planGeneratedFileWrites({
    cwd,
    configName: 'elog.config.ts',
    files: {
      configText: 'new config',
    },
    timestamp: '20260516-153012',
  });

  expect(plan.map((item) => path.basename(item.targetPath))).toEqual(['elog.config.ts']);
  expect(plan[0]?.backupPath?.endsWith('elog.config.backup.20260516-153012.ts')).toBe(true);
});
```

Update every `files` object in this test file to contain only:

```ts
files: {
  configText: 'new config',
},
```

Replace the `backs up existing files before writing new files` test with:

```ts
it('backs up existing config before writing new config', async () => {
  const cwd = makeTempDir();
  fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');

  await writeGeneratedFiles({
    cwd,
    configName: 'elog.config.ts',
    files: {
      configText: 'new config',
    },
    timestamp: '20260516-153012',
    overwriteExisting: () => true,
  });

  expect(fs.readFileSync(path.join(cwd, 'elog.config.ts'), 'utf8')).toBe('new config');
  expect(fs.readFileSync(path.join(cwd, 'elog.config.backup.20260516-153012.ts'), 'utf8')).toBe(
    'old config',
  );
  expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
  expect(fs.existsSync(path.join(cwd, '.env.example'))).toBe(false);
});
```

- [ ] **Step 2: Run file-writer tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/file-writer.test.ts
```

Expected: FAIL because `planGeneratedFileWrites` still includes `.env` and `.env.example`.

- [ ] **Step 3: Update file writer to write only config**

In `packages/elog/src/commands/init/file-writer.ts`, replace the `targets` array in `planGeneratedFileWrites` with:

```ts
const targets = [{ filename: options.configName, content: options.files.configText }];
```

- [ ] **Step 4: Run file-writer tests and verify they pass**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/file-writer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Update init command tests to remove env/redaction behavior**

In `packages/elog/src/commands/init/command.test.ts`, remove:

```ts
import inquirer from 'inquirer';
import type { EnsureEnvIgnoredOptions } from './gitignore';
```

Remove the entire `describe('redactEnvText', ...)` block.

Change `sampleFiles` to:

```ts
const sampleFiles: GeneratedInitFiles = {
  configText: "import { defineConfig } from '@elogx-test/elog';\n",
};
```

Replace `createInitDryRunOutput` tests with:

```ts
describe('createInitDryRunOutput', () => {
  it('prints install command and config only', () => {
    const input = { ...sampleFiles, installCommand: 'pnpm add @elogx-test/plugin-from-notion' };
    const output = createInitDryRunOutput(input);

    expect(output).toContain('pnpm add @elogx-test/plugin-from-notion');
    expect(output).toContain(sampleFiles.configText);
    expect(output).not.toContain('.env');
    expect(output).not.toContain('redacted');
  });

  it('uses custom configName in output label', () => {
    const input = { ...sampleFiles, installCommand: 'pnpm add foo' };
    const output = createInitDryRunOutput(input, 'custom.config.ts');

    expect(output).toContain('custom.config.ts:');
    expect(output).not.toContain('elog.config.ts:');
  });
});
```

In `baseOptions`, remove `ensureEnvIgnored`.

Replace the dry-run side-effect test with:

```ts
it('with dryRun: does NOT call installPackages or writeGeneratedFiles', async () => {
  const installPackages = vi.fn();
  const writeGeneratedFiles = vi.fn();
  const log = vi.fn();

  await runInitCommand({
    ...baseOptions,
    dryRun: true,
    installPackages,
    writeGeneratedFiles,
    log,
  });

  expect(installPackages).not.toHaveBeenCalled();
  expect(writeGeneratedFiles).not.toHaveBeenCalled();
});
```

Replace the non-dry-run side-effect test with:

```ts
it('without dryRun: calls installPackages and writeGeneratedFiles only', async () => {
  const installPackages = vi.fn(() => ({
    command: 'pnpm',
    args: ['add', 'a'],
    display: 'pnpm add a',
  }));
  const writeGeneratedFiles = vi.fn(async () => []);

  await runInitCommand({
    ...baseOptions,
    dryRun: false,
    installPackages,
    writeGeneratedFiles,
  });

  expect(installPackages).toHaveBeenCalledTimes(1);
  expect(writeGeneratedFiles).toHaveBeenCalledTimes(1);
});
```

Delete the tests named:

```ts
without dryRun: passes shouldAdd callback to ensureEnvIgnored
without dryRun: asks before adding .env to .gitignore
```

- [ ] **Step 6: Run init command tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/command.test.ts
```

Expected: FAIL because `RunInitCommandOptions` and `runInitCommand` still include env/gitignore behavior and use answer-bearing selections.

- [ ] **Step 7: Update init command to use plugin selection only**

In `packages/elog/src/commands/init/command.ts`, remove these imports:

```ts
import { ensureEnvIgnored } from './gitignore';
import type { EnsureEnvIgnoredOptions } from './gitignore';
import { runInitWizard, withHiddenDefaults } from './wizard';
```

Add this import:

```ts
import { runPluginSelectionWizard } from './wizard';
```

Change the type import to:

```ts
import type { GeneratedInitFiles, PluginRegistry, PluginSelection } from './types';
```

Change `RunInitCommandOptions` to:

```ts
export interface RunInitCommandOptions {
  cwd: string;
  configName: string;
  dryRun: boolean;
  loadRegistry?: () => PluginRegistry;
  runWizard?: (registry: PluginRegistry) => Promise<PluginSelection>;
  installPackages?: (options: InstallPackagesOptions) => ReturnType<typeof installPackages>;
  writeGeneratedFiles?: (options: WriteGeneratedFilesOptions) => Promise<GeneratedFileWrite[]>;
  overwriteExisting?: (filename: string) => Promise<boolean>;
  log?: (message: string) => void;
}
```

Delete `redactEnvText`.

Replace `selectedPackages` with:

```ts
export function selectedPackages(selection: PluginSelection): string[] {
  const allPlugins = [selection.from, ...selection.transforms, ...selection.to];
  const seen = new Set<string>();
  return allPlugins
    .map((plugin) => plugin.packageName)
    .filter((name) => {
      if (seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    });
}
```

Replace `createInitDryRunOutput` with:

```ts
export function createInitDryRunOutput(
  files: GeneratedInitFiles & { installCommand: string },
  configName = 'elog.config.ts',
): string {
  const sections = [
    `Install command:\n${files.installCommand}`,
    `${configName}:\n${files.configText}`,
  ];
  return sections.join('\n\n');
}
```

Replace `createDefaultInitSelection` with:

```ts
export function createDefaultInitSelection(registry: PluginRegistry): PluginSelection {
  const fromEntry = getPluginsByKind(registry, 'from')[0];
  const toEntry = getPluginsByKind(registry, 'to')[0];

  if (!fromEntry || !toEntry) {
    throw new InitCommandError(
      'PLUGIN_SELECTION_EMPTY',
      'Must have at least one source and one target plugin for init dry-run.',
    );
  }

  return {
    from: fromEntry,
    transforms: [],
    to: [toEntry],
  };
}
```

In `runInitCommand`, set:

```ts
const runWizard = options.runWizard ?? runPluginSelectionWizard;
```

Delete:

```ts
const doEnsureIgnored = options.ensureEnvIgnored ?? ensureEnvIgnored;
```

Delete the `shouldAdd` callback and the final `await doEnsureIgnored(...)` block.

- [ ] **Step 8: Run init command tests and verify they pass**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init/command.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run all init command tests**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/init
```

Expected: PASS. `gitignore.test.ts` may still pass because the helper can remain in the codebase even though `init` no longer calls it.

- [ ] **Step 10: Commit config-only init**

Run:

```bash
git add packages/elog/src/commands/init
git commit -m "refactor: make init write config only"
```

---

### Task 4: Extract Shared Sync Result Reporting

**Files:**
- Create: `packages/elog/src/commands/sync/results.ts`
- Create: `packages/elog/src/commands/sync/results.test.ts`
- Modify: `packages/elog/src/commands/sync/command.ts`

- [ ] **Step 1: Write tests for shared result handling**

Create `packages/elog/src/commands/sync/results.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { reportWorkflowResults, throwOnFailedWorkflow } from './results';
import type { WorkflowResult } from '../../runtime/types';

describe('reportWorkflowResults', () => {
  it('logs formatted workflow result lines', () => {
    const log = vi.fn();
    const results: WorkflowResult[] = [
      {
        status: 'success',
        workflowId: 'workflow-1',
        syncedCount: 2,
        cacheFilePath: 'elog.cache.json',
        sortedDocList: [],
      },
    ];

    reportWorkflowResults(results, log);

    expect(log).toHaveBeenCalledWith('同步结果', 'workflow-1: synced 2 document(s), cache elog.cache.json');
  });
});

describe('throwOnFailedWorkflow', () => {
  it('throws the first failed workflow error', () => {
    const error = new Error('deploy failed');
    const results: WorkflowResult[] = [
      {
        status: 'failed',
        workflowId: 'workflow-1',
        error,
      },
    ];

    expect(() => throwOnFailedWorkflow(results)).toThrow(error);
  });

  it('does not throw when there are no failed workflows', () => {
    const results: WorkflowResult[] = [
      {
        status: 'skipped',
        workflowId: 'workflow-1',
        reason: 'disabled',
      },
    ];

    expect(() => throwOnFailedWorkflow(results)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run result helper tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/sync/results.test.ts
```

Expected: FAIL because `results.ts` does not exist.

- [ ] **Step 3: Implement shared result helper**

Create `packages/elog/src/commands/sync/results.ts`:

```ts
import out from '../../logging/logger';
import type { WorkflowResult } from '../../runtime/types';
import { formatWorkflowResults } from './format';

type FailedWorkflowResult = Extract<WorkflowResult, { status: 'failed' }>;
type ResultLogger = (head: string, message: string) => void;

function isFailedWorkflowResult(result: WorkflowResult): result is FailedWorkflowResult {
  return result.status === 'failed';
}

export function reportWorkflowResults(
  results: WorkflowResult[],
  log: ResultLogger = out.info,
): void {
  for (const line of formatWorkflowResults(results)) {
    log('同步结果', line);
  }
}

export function throwOnFailedWorkflow(results: WorkflowResult[]): void {
  const failed = results.find(isFailedWorkflowResult);
  if (failed) {
    throw failed.error;
  }
}
```

- [ ] **Step 4: Update sync command to use helper**

In `packages/elog/src/commands/sync/command.ts`, remove:

```ts
import type { WorkflowResult } from '../../runtime/types';
import { formatWorkflowResults } from './format';

type FailedWorkflowResult = Extract<WorkflowResult, { status: 'failed' }>;

function isFailedWorkflowResult(result: WorkflowResult): result is FailedWorkflowResult {
  return result.status === 'failed';
}
```

Add:

```ts
import { reportWorkflowResults, throwOnFailedWorkflow } from './results';
```

Replace the result reporting block with:

```ts
reportWorkflowResults(results);
throwOnFailedWorkflow(results);
```

- [ ] **Step 5: Run sync tests and verify they pass**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/sync
```

Expected: PASS.

- [ ] **Step 6: Commit result helper**

Run:

```bash
git add packages/elog/src/commands/sync
git commit -m "refactor: share sync result reporting"
```

---

### Task 5: Build Export Runtime Config In Memory

**Files:**
- Create: `packages/elog/src/commands/export/runtime-config.ts`
- Create: `packages/elog/src/commands/export/runtime-config.test.ts`

- [ ] **Step 1: Write runtime config tests**

Create `packages/elog/src/commands/export/runtime-config.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { ExportCommandError, buildExportRuntimeConfig } from './runtime-config';
import type { InitSelection, PluginRegistryEntry } from '../init/types';

const fromEntry: PluginRegistryEntry = {
  kind: 'from',
  type: 'yuque-token',
  displayName: '语雀',
  packageName: '@elogx-test/plugin-from-yuque-token',
  importName: 'fromYuque',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

const transformEntry: PluginRegistryEntry = {
  kind: 'transform',
  type: 'image-local',
  displayName: '下载图片到本地',
  packageName: '@elogx-test/plugin-image-local',
  importName: 'imageLocal',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

const toEntry: PluginRegistryEntry = {
  kind: 'to',
  type: 'local',
  displayName: '本地目录',
  packageName: '@elogx-test/plugin-to-local',
  importName: 'toLocal',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

function createSelection(): InitSelection {
  return {
    from: {
      entry: fromEntry,
      answers: { token: 'secret-token', login: '1874', repo: 'docs' },
    },
    transforms: [
      {
        entry: transformEntry,
        answers: { outputDir: './images' },
      },
    ],
    to: [
      {
        entry: toEntry,
        answers: { outputDir: './docs' },
      },
    ],
  };
}

describe('buildExportRuntimeConfig', () => {
  it('imports plugin factories, passes answers directly, and disables cache', async () => {
    const fromPlugin = { name: 'from:yuque', kind: 'from' as const, download: vi.fn() };
    const transformPlugin = { name: 'transform:image-local', kind: 'transform' as const, transform: vi.fn() };
    const toPlugin = { name: 'to:local', kind: 'to' as const, deploy: vi.fn() };
    const fromFactory = vi.fn(() => fromPlugin);
    const transformFactory = vi.fn(() => transformPlugin);
    const toFactory = vi.fn(() => toPlugin);
    const loadPlugin = vi.fn(async (packageName: string) => {
      if (packageName === fromEntry.packageName) {
        return fromFactory;
      }
      if (packageName === transformEntry.packageName) {
        return transformFactory;
      }
      return toFactory;
    });

    const config = await buildExportRuntimeConfig(createSelection(), { loadPlugin });

    expect(config.disableCache).toBe(true);
    expect(config.from).toBe(fromPlugin);
    expect(config.plugins).toEqual([transformPlugin]);
    expect(config.to).toBe(toPlugin);
    expect(fromFactory).toHaveBeenCalledWith({
      token: 'secret-token',
      login: '1874',
      repo: 'docs',
    });
    expect(process.env.YUQUE_TOKEN).toBeUndefined();
  });

  it('keeps multiple targets as an array', async () => {
    const firstTarget = { name: 'to:local-1', kind: 'to' as const, deploy: vi.fn() };
    const secondTarget = { name: 'to:local-2', kind: 'to' as const, deploy: vi.fn() };
    const targetFactories = [vi.fn(() => firstTarget), vi.fn(() => secondTarget)];
    const selection = createSelection();
    selection.to = [
      { entry: { ...toEntry, packageName: '@elogx-test/plugin-to-local-a' }, answers: { outputDir: './a' } },
      { entry: { ...toEntry, packageName: '@elogx-test/plugin-to-local-b' }, answers: { outputDir: './b' } },
    ];
    const loadPlugin = vi.fn(async (packageName: string) => {
      if (packageName === fromEntry.packageName) {
        return vi.fn(() => ({ name: 'from:yuque', kind: 'from' as const, download: vi.fn() }));
      }
      if (packageName === transformEntry.packageName) {
        return vi.fn(() => ({ name: 'transform:image-local', kind: 'transform' as const, transform: vi.fn() }));
      }
      return packageName.endsWith('-a') ? targetFactories[0]! : targetFactories[1]!;
    });

    const config = await buildExportRuntimeConfig(selection, { loadPlugin });

    expect(config.to).toEqual([firstTarget, secondTarget]);
  });

  it('wraps import failures as ExportCommandError', async () => {
    const loadPlugin = vi.fn(async () => {
      throw new Error('Cannot find module');
    });

    await expect(buildExportRuntimeConfig(createSelection(), { loadPlugin })).rejects.toMatchObject({
      code: 'EXPORT_PLUGIN_IMPORT_FAILED',
    });
  });

  it('wraps factory failures as ExportCommandError', async () => {
    const loadPlugin = vi.fn(async () => {
      return vi.fn(() => {
        throw new Error('bad options');
      });
    });

    await expect(buildExportRuntimeConfig(createSelection(), { loadPlugin })).rejects.toMatchObject({
      code: 'EXPORT_PLUGIN_FACTORY_FAILED',
    });
  });

  it('exposes stable export error codes', () => {
    const error = new ExportCommandError('EXPORT_PLUGIN_IMPORT_FAILED', 'Import failed');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ExportCommandError');
    expect(error.code).toBe('EXPORT_PLUGIN_IMPORT_FAILED');
  });
});
```

- [ ] **Step 2: Run runtime config tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/export/runtime-config.test.ts
```

Expected: FAIL because export runtime files do not exist.

- [ ] **Step 3: Implement runtime config builder**

Create `packages/elog/src/commands/export/runtime-config.ts`:

```ts
import type { ElogConfig } from '../../types/common';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../../plugins/types';
import type { InitSelection, SelectedPlugin } from '../init/types';

type ExportCommandErrorCode =
  | 'EXPORT_PLUGIN_IMPORT_FAILED'
  | 'EXPORT_PLUGIN_FACTORY_FAILED';

type PluginFactory = (options: Record<string, unknown>) => FromPlugin | TransformPlugin | ToPlugin;
type PluginModule = { default?: PluginFactory } | PluginFactory;

export interface BuildExportRuntimeConfigOptions {
  loadPlugin?: (packageName: string) => Promise<PluginFactory>;
}

export class ExportCommandError extends Error {
  readonly code: ExportCommandErrorCode;

  constructor(code: ExportCommandErrorCode, message: string) {
    super(message);
    this.name = 'ExportCommandError';
    this.code = code;
  }
}

async function defaultLoadPlugin(packageName: string): Promise<PluginFactory> {
  let module: PluginModule;
  try {
    module = (await import(packageName)) as PluginModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExportCommandError(
      'EXPORT_PLUGIN_IMPORT_FAILED',
      `Failed to import ${packageName}: ${message}`,
    );
  }

  const factory = typeof module === 'function' ? module : module.default;
  if (typeof factory !== 'function') {
    throw new ExportCommandError(
      'EXPORT_PLUGIN_IMPORT_FAILED',
      `Plugin package ${packageName} does not export a default factory function.`,
    );
  }
  return factory;
}

async function createPlugin(
  selected: SelectedPlugin,
  loadPlugin: (packageName: string) => Promise<PluginFactory>,
): Promise<FromPlugin | TransformPlugin | ToPlugin> {
  const factory = await loadPlugin(selected.entry.packageName);
  try {
    return factory(selected.answers);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExportCommandError(
      'EXPORT_PLUGIN_FACTORY_FAILED',
      `Failed to create ${selected.entry.packageName}: ${message}`,
    );
  }
}

export async function buildExportRuntimeConfig(
  selection: InitSelection,
  options: BuildExportRuntimeConfigOptions = {},
): Promise<ElogConfig> {
  const loadPlugin = options.loadPlugin ?? defaultLoadPlugin;
  const from = (await createPlugin(selection.from, loadPlugin)) as FromPlugin;
  const plugins = (await Promise.all(
    selection.transforms.map((plugin) => createPlugin(plugin, loadPlugin)),
  )) as TransformPlugin[];
  const targets = (await Promise.all(
    selection.to.map((plugin) => createPlugin(plugin, loadPlugin)),
  )) as ToPlugin[];

  return {
    disableCache: true,
    from,
    ...(plugins.length ? { plugins } : {}),
    to: targets.length === 1 ? targets[0]! : targets,
  };
}
```

- [ ] **Step 4: Run runtime config tests and verify they pass**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/export/runtime-config.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit runtime config builder**

Run:

```bash
git add packages/elog/src/commands/export/runtime-config.ts packages/elog/src/commands/export/runtime-config.test.ts
git commit -m "feat: build export runtime config"
```

---

### Task 6: Add Export Command Orchestration

**Files:**
- Create: `packages/elog/src/commands/export/command.ts`
- Create: `packages/elog/src/commands/export/command.test.ts`
- Create: `packages/elog/src/commands/export/index.ts`

- [ ] **Step 1: Write export command orchestration tests**

Create `packages/elog/src/commands/export/command.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { runExportCommand, selectedPackages } from './command';
import type { ElogConfig } from '../../types/common';
import type { WorkflowResult } from '../../runtime/types';
import type { InitSelection, PluginRegistry, PluginRegistryEntry } from '../init/types';

const fromEntry: PluginRegistryEntry = {
  kind: 'from',
  type: 'yuque-token',
  displayName: '语雀',
  packageName: '@elogx-test/plugin-from-yuque-token',
  importName: 'fromYuque',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

const transformEntry: PluginRegistryEntry = {
  kind: 'transform',
  type: 'image-local',
  displayName: '下载图片到本地',
  packageName: '@elogx-test/plugin-image-local',
  importName: 'imageLocal',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

const toEntry: PluginRegistryEntry = {
  kind: 'to',
  type: 'local',
  displayName: '本地目录',
  packageName: '@elogx-test/plugin-to-local',
  importName: 'toLocal',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

const registry: PluginRegistry = {
  schemaVersion: 1,
  plugins: [fromEntry, transformEntry, toEntry],
};

const selection: InitSelection = {
  from: { entry: fromEntry, answers: { token: 'secret-token' } },
  transforms: [{ entry: transformEntry, answers: { outputDir: './images' } }],
  to: [{ entry: toEntry, answers: { outputDir: './docs' } }],
};

describe('selectedPackages', () => {
  it('extracts unique package names from export selection', () => {
    expect(selectedPackages(selection)).toEqual([
      '@elogx-test/plugin-from-yuque-token',
      '@elogx-test/plugin-image-local',
      '@elogx-test/plugin-to-local',
    ]);
  });
});

describe('runExportCommand', () => {
  it('installs selected packages, builds runtime config, runs elog, and reports results', async () => {
    const runtimeConfig = { disableCache: true } as ElogConfig;
    const results: WorkflowResult[] = [
      {
        status: 'success',
        workflowId: 'workflow-1',
        syncedCount: 1,
        cacheFilePath: 'elog.cache.json',
        sortedDocList: [],
      },
    ];
    const installPackages = vi.fn(() => ({
      command: 'pnpm',
      args: ['add'],
      display: 'pnpm add',
    }));
    const buildRuntimeConfig = vi.fn(async () => runtimeConfig);
    const runRuntime = vi.fn(async () => results);
    const reportResults = vi.fn();
    const throwOnFailed = vi.fn();

    await runExportCommand({
      cwd: '/tmp/project',
      loadRegistry: () => registry,
      runWizard: async () => selection,
      installPackages,
      buildRuntimeConfig,
      runRuntime,
      reportResults,
      throwOnFailed,
    });

    expect(installPackages).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: '/tmp/project',
        packages: [
          '@elogx-test/plugin-from-yuque-token',
          '@elogx-test/plugin-image-local',
          '@elogx-test/plugin-to-local',
        ],
      }),
    );
    expect(buildRuntimeConfig).toHaveBeenCalledWith(selection);
    expect(runRuntime).toHaveBeenCalledWith(runtimeConfig);
    expect(reportResults).toHaveBeenCalledWith(results);
    expect(throwOnFailed).toHaveBeenCalledWith(results);
  });

  it('propagates failed workflow errors through shared failure handling', async () => {
    const error = new Error('deploy failed');
    const results: WorkflowResult[] = [{ status: 'failed', workflowId: 'workflow-1', error }];

    await expect(
      runExportCommand({
        cwd: '/tmp/project',
        loadRegistry: () => registry,
        runWizard: async () => selection,
        installPackages: vi.fn(() => ({ command: 'pnpm', args: ['add'], display: 'pnpm add' })),
        buildRuntimeConfig: vi.fn(async () => ({ disableCache: true } as ElogConfig)),
        runRuntime: vi.fn(async () => results),
        reportResults: vi.fn(),
        throwOnFailed: () => {
          throw error;
        },
      }),
    ).rejects.toThrow(error);
  });
});
```

- [ ] **Step 2: Run export command tests and verify they fail**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/export/command.test.ts
```

Expected: FAIL because `command.ts` does not exist.

- [ ] **Step 3: Implement export command**

Create `packages/elog/src/commands/export/command.ts`:

```ts
import elog from '../../node-entry';
import type { ElogConfig } from '../../types/common';
import type { WorkflowResult } from '../../runtime/types';
import { detectPackageManager, installPackages } from '../init/package-manager';
import type { InstallPackagesOptions } from '../init/package-manager';
import { loadBuiltInPluginRegistry } from '../init/registry';
import type { InitSelection, PluginRegistry } from '../init/types';
import { runExportWizard } from '../init/wizard';
import { reportWorkflowResults, throwOnFailedWorkflow } from '../sync/results';
import { buildExportRuntimeConfig } from './runtime-config';

export interface RunExportCommandOptions {
  cwd: string;
  loadRegistry?: () => PluginRegistry;
  runWizard?: (registry: PluginRegistry) => Promise<InitSelection>;
  installPackages?: (options: InstallPackagesOptions) => ReturnType<typeof installPackages>;
  buildRuntimeConfig?: (selection: InitSelection) => Promise<ElogConfig>;
  runRuntime?: (config: ElogConfig) => Promise<WorkflowResult[]>;
  reportResults?: (results: WorkflowResult[]) => void;
  throwOnFailed?: (results: WorkflowResult[]) => void;
}

export function selectedPackages(selection: InitSelection): string[] {
  const allPlugins = [selection.from, ...selection.transforms, ...selection.to];
  const seen = new Set<string>();
  return allPlugins
    .map((plugin) => plugin.entry.packageName)
    .filter((name) => {
      if (seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    });
}

export async function runExportCommand(options: RunExportCommandOptions): Promise<void> {
  const loadRegistry = options.loadRegistry ?? loadBuiltInPluginRegistry;
  const runWizard = options.runWizard ?? runExportWizard;
  const doInstall = options.installPackages ?? installPackages;
  const doBuildRuntimeConfig = options.buildRuntimeConfig ?? buildExportRuntimeConfig;
  const runRuntime = options.runRuntime ?? elog;
  const reportResults = options.reportResults ?? reportWorkflowResults;
  const throwOnFailed = options.throwOnFailed ?? throwOnFailedWorkflow;

  const registry = loadRegistry();
  const selection = await runWizard(registry);
  const packages = selectedPackages(selection);
  const packageManager = detectPackageManager(options.cwd);

  doInstall({ cwd: options.cwd, packageManager, packages });

  const runtimeConfig = await doBuildRuntimeConfig(selection);
  const results = await runRuntime(runtimeConfig);
  reportResults(results);
  throwOnFailed(results);
}
```

- [ ] **Step 4: Add export command index**

Create `packages/elog/src/commands/export/index.ts`:

```ts
export { runExportCommand } from './command';
```

- [ ] **Step 5: Run export command tests and verify they pass**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/commands/export
```

Expected: PASS.

- [ ] **Step 6: Commit export command**

Run:

```bash
git add packages/elog/src/commands/export
git commit -m "feat: add export command runtime flow"
```

---

### Task 7: Register `elog export` In The CLI

**Files:**
- Modify: `packages/elog/src/cli.ts`
- Modify: `packages/elog/src/cli-smoke.test.ts`

- [ ] **Step 1: Write CLI registration test**

In `packages/elog/src/cli-smoke.test.ts`, add this import:

```ts
import { createProgram } from './cli';
```

Add this test:

```ts
it('registers the export command', () => {
  const program = createProgram();
  const commandNames = program.commands.map((command) => command.name());

  expect(commandNames).toContain('export');
});
```

- [ ] **Step 2: Run CLI smoke test and verify it fails**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/cli-smoke.test.ts
```

Expected: FAIL because `export` is not registered.

- [ ] **Step 3: Register export command**

In `packages/elog/src/cli.ts`, add:

```ts
import { runExportCommand } from './commands/export';
```

Add this command registration between `init` and `sync`:

```ts
program
  .command('export')
  .description('export docs once without writing config files')
  .action(() =>
    handleAction(() =>
      runExportCommand({
        cwd: process.cwd(),
      }),
    ),
  );
```

- [ ] **Step 4: Run CLI smoke test and verify it passes**

Run:

```bash
pnpm --filter @elogx-test/elog test -- src/cli-smoke.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit CLI registration**

Run:

```bash
git add packages/elog/src/cli.ts packages/elog/src/cli-smoke.test.ts
git commit -m "feat: register export command"
```

---

### Task 8: Update Init Dry-Run E2E Case

**Files:**
- Modify: `tests/e2e/command-cases/init-dry-run.case.ts`

- [ ] **Step 1: Update e2e command case assertions**

Replace `tests/e2e/command-cases/init-dry-run.case.ts` with:

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
    expectOutputContains(result, 'Install command:');
    expectOutputContains(result, 'elog.config.ts:');
    expectOutputContains(result, "import { defineConfig } from '@elogx-test/elog';");
    expectOutputContains(result, 'from:');
    expectOutputContains(result, 'to:');
    expect(result.combinedOutput).not.toContain('.env');
    expect(result.combinedOutput).not.toContain('redacted');
    expect(fs.existsSync(path.join(workspace, 'elog.config.ts'))).toBe(false);
    expect(fs.existsSync(path.join(workspace, '.env'))).toBe(false);
    expect(fs.existsSync(path.join(workspace, '.env.example'))).toBe(false);
  },
};

export default commandCase;
```

- [ ] **Step 2: Run e2e command tests**

Run:

```bash
pnpm test:e2e:commands
```

Expected: PASS for command e2e cases including `init-dry-run`.

- [ ] **Step 3: Commit e2e update**

Run:

```bash
git add tests/e2e/command-cases/init-dry-run.case.ts
git commit -m "test: update init dry run e2e"
```

---

### Task 9: Full Verification And Cleanup

**Files:**
- Review all files modified by previous tasks.

- [ ] **Step 1: Search for stale init env behavior in command path**

Run:

```bash
rg -n "redactEnvText|envExampleText|ensureEnvIgnored|\\.env \\(redacted\\)|是否将 \\.env" packages/elog/src/commands
```

Expected: no matches in `packages/elog/src/commands/init/command.ts`, `packages/elog/src/commands/init/generator.ts`, or `packages/elog/src/commands/init/file-writer.ts`. Matches in `gitignore.ts` or `gitignore.test.ts` are acceptable because the helper may remain unused.

- [ ] **Step 2: Search for export dry-run**

Run:

```bash
rg -n "export.*dry|dry.*export|--dry-run" packages/elog/src/commands/export packages/elog/src/cli.ts
```

Expected: no matches for export dry-run support.

- [ ] **Step 3: Run core package tests**

Run:

```bash
pnpm --filter @elogx-test/elog test
```

Expected: PASS.

- [ ] **Step 4: Build core package**

Run:

```bash
pnpm --filter @elogx-test/elog build
```

Expected: PASS.

- [ ] **Step 5: Run command e2e tests**

Run:

```bash
pnpm test:e2e:commands
```

Expected: PASS.

- [ ] **Step 6: Inspect final diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: clean if every task committed. If changes remain, inspect them and commit only intentional files.

- [ ] **Step 7: Final commit if needed**

If Step 6 shows intentional uncommitted changes, run:

```bash
git add packages/elog/src tests/e2e/command-cases/init-dry-run.case.ts
git commit -m "test: verify init export command split"
```

Expected: either a new commit is created for remaining intentional changes or no commit is needed because the worktree is clean.

---

## Self-Review

- Spec coverage: Tasks 1-3 implement config-only `init`; Tasks 5-7 implement one-time `export`; Task 4 shares sync result behavior; Task 8 updates stale e2e coverage; Task 9 verifies no export dry-run/cache/env-file behavior leaks into the implementation.
- Completeness scan: The plan contains no deferred-detail markers. Each code-changing step includes exact code or replacement snippets.
- Type consistency: `PluginSelection`, `InitSelection`, `SelectedPlugin`, `GeneratedInitFiles`, `buildExportRuntimeConfig`, `runExportCommand`, `reportWorkflowResults`, and `throwOnFailedWorkflow` are introduced before later tasks use them.
