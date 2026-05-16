import inquirer from 'inquirer';
import { describe, expect, it, vi } from 'vitest';
import { createInitDryRunOutput, redactEnvText, runInitCommand, selectedPackages } from './command';
import type { RunInitCommandOptions } from './command';
import type { EnsureEnvIgnoredOptions } from './gitignore';
import type { GeneratedInitFiles, InitSelection, PluginRegistry } from './types';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

const sampleRegistry: PluginRegistry = {
  schemaVersion: 1,
  plugins: [
    {
      kind: 'from',
      type: 'from:notion',
      displayName: 'Notion',
      packageName: '@elogx-test/plugin-from-notion',
      importName: 'notion',
      optionsSchema: { type: 'object', properties: {} },
    },
    {
      kind: 'transform',
      type: 'transform:image-local',
      displayName: 'Local Images',
      packageName: '@elogx-test/plugin-image-local',
      importName: 'imageLocal',
      optionsSchema: { type: 'object', properties: {} },
    },
    {
      kind: 'to',
      type: 'to:local',
      displayName: 'Local',
      packageName: '@elogx-test/plugin-to-local',
      importName: 'toLocal',
      optionsSchema: { type: 'object', properties: {} },
    },
  ],
};

const sampleSelection: InitSelection = {
  from: {
    entry: sampleRegistry.plugins[0]!,
    answers: {},
  },
  transforms: [
    {
      entry: sampleRegistry.plugins[1]!,
      answers: {},
    },
  ],
  to: [
    {
      entry: sampleRegistry.plugins[2]!,
      answers: {},
    },
  ],
};

const sampleFiles: GeneratedInitFiles = {
  configText: "import { defineConfig } from '@elogx-test/elog';\n",
  envText: 'NOTION_TOKEN=secret123\nNOTION_SPACE=myspace\n',
  envExampleText: 'NOTION_TOKEN=\nNOTION_SPACE=\n',
};

describe('redactEnvText', () => {
  it('replaces values after = with <redacted>', () => {
    expect(redactEnvText('FOO=bar\nBAZ=secret\n')).toBe('FOO=<redacted>\nBAZ=<redacted>\n');
  });

  it('preserves lines without =', () => {
    expect(redactEnvText('FOO=bar\n# comment\n')).toBe('FOO=<redacted>\n# comment\n');
  });

  it('handles empty values', () => {
    expect(redactEnvText('FOO=\n')).toBe('FOO=<redacted>\n');
  });

  it('handles empty string', () => {
    expect(redactEnvText('')).toBe('');
  });
});

describe('createInitDryRunOutput', () => {
  it('redacts env values while preserving config and envExample', () => {
    const input = { ...sampleFiles, installCommand: 'pnpm add @elogx-test/plugin-from-notion' };
    const output = createInitDryRunOutput(input);

    expect(output).toContain('pnpm add @elogx-test/plugin-from-notion');
    expect(output).toContain(sampleFiles.configText);
    expect(output).toContain('NOTION_TOKEN=<redacted>');
    expect(output).toContain('NOTION_SPACE=<redacted>');
    expect(output).toContain('NOTION_TOKEN=');
    expect(output).toContain('NOTION_SPACE=');
  });

  it('does not leak real env values', () => {
    const input = { ...sampleFiles, installCommand: 'pnpm add foo' };
    const output = createInitDryRunOutput(input);

    expect(output).not.toContain('secret123');
    expect(output).not.toContain('myspace');
  });

  it('uses custom configName in output label', () => {
    const input = { ...sampleFiles, installCommand: 'pnpm add foo' };
    const output = createInitDryRunOutput(input, 'custom.config.ts');

    expect(output).toContain('custom.config.ts:');
    expect(output).not.toContain('elog.config.ts:');
  });
});

describe('selectedPackages', () => {
  it('extracts unique package names from all plugin kinds', () => {
    const packages = selectedPackages(sampleSelection);
    expect(packages).toEqual([
      '@elogx-test/plugin-from-notion',
      '@elogx-test/plugin-image-local',
      '@elogx-test/plugin-to-local',
    ]);
  });

  it('deduplicates when the same package appears in multiple kinds', () => {
    const selection: InitSelection = {
      from: {
        entry: sampleRegistry.plugins[0]!,
        answers: {},
      },
      transforms: [],
      to: [
        {
          entry: sampleRegistry.plugins[0]!,
          answers: {},
        },
      ],
    };
    const packages = selectedPackages(selection);
    expect(packages).toEqual(['@elogx-test/plugin-from-notion']);
  });
});

describe('runInitCommand', () => {
  const baseOptions: Omit<RunInitCommandOptions, 'dryRun'> = {
    cwd: '/tmp/test-project',
    configName: 'elog.config.ts',
    loadRegistry: () => sampleRegistry,
    runWizard: async () => sampleSelection,
    installPackages: vi.fn(() => ({
      command: 'pnpm',
      args: ['add', 'a'],
      display: 'pnpm add a',
    })),
    writeGeneratedFiles: vi.fn(async () => []),
    ensureEnvIgnored: vi.fn(async () => true),
    log: vi.fn(),
  };

  it('with dryRun: does NOT call installPackages, writeGeneratedFiles, or ensureEnvIgnored', async () => {
    const installPackages = vi.fn();
    const writeGeneratedFiles = vi.fn();
    const ensureEnvIgnored = vi.fn();
    const log = vi.fn();

    await runInitCommand({
      ...baseOptions,
      dryRun: true,
      installPackages,
      writeGeneratedFiles,
      ensureEnvIgnored,
      log,
    });

    expect(installPackages).not.toHaveBeenCalled();
    expect(writeGeneratedFiles).not.toHaveBeenCalled();
    expect(ensureEnvIgnored).not.toHaveBeenCalled();
  });

  it('with dryRun: calls log with dry-run output', async () => {
    const log = vi.fn();

    await runInitCommand({
      ...baseOptions,
      dryRun: true,
      log,
    });

    expect(log).toHaveBeenCalledTimes(1);
    const output = log.mock.calls[0]![0] as string;
    expect(output).toContain('pnpm add');
  });

  it('without dryRun: calls installPackages, writeGeneratedFiles, and ensureEnvIgnored', async () => {
    const installPackages = vi.fn(() => ({
      command: 'pnpm',
      args: ['add', 'a'],
      display: 'pnpm add a',
    }));
    const writeGeneratedFiles = vi.fn(async () => []);
    const ensureEnvIgnored = vi.fn(async () => true);

    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      installPackages,
      writeGeneratedFiles,
      ensureEnvIgnored,
    });

    expect(installPackages).toHaveBeenCalledTimes(1);
    expect(writeGeneratedFiles).toHaveBeenCalledTimes(1);
    expect(ensureEnvIgnored).toHaveBeenCalledTimes(1);
  });

  it('without dryRun: passes correct cwd to installPackages', async () => {
    const installPackages = vi.fn(() => ({
      command: 'pnpm',
      args: ['add', 'a'],
      display: 'pnpm add a',
    }));

    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      installPackages,
    });

    expect(installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: '/tmp/test-project' }),
    );
  });

  it('without dryRun: passes overwriteExisting callback to writeGeneratedFiles', async () => {
    const writeGeneratedFiles = vi.fn(async () => []);

    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      writeGeneratedFiles,
    });

    expect(writeGeneratedFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        overwriteExisting: expect.any(Function),
      }),
    );
  });

  it('without dryRun: passes shouldAdd callback to ensureEnvIgnored', async () => {
    const ensureEnvIgnored = vi.fn(async () => true);

    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      ensureEnvIgnored,
    });

    expect(ensureEnvIgnored).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: '/tmp/test-project',
        shouldAdd: expect.any(Function),
      }),
    );
  });

  it('without dryRun: asks before adding .env to .gitignore', async () => {
    const prompt = vi.mocked(inquirer.prompt);
    prompt.mockResolvedValueOnce({ addEnvToGitignore: false });
    const ensureEnvIgnored = vi.fn(async (options: EnsureEnvIgnoredOptions) => options.shouldAdd());

    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      ensureEnvIgnored,
    });

    expect(prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'confirm',
        name: 'addEnvToGitignore',
        message: '是否将 .env 添加到 .gitignore？',
        default: true,
      }),
    ]);
  });

  it('without dryRun: uses injected overwriteExisting when provided', async () => {
    const overwriteExisting = vi.fn(async () => true);
    const writeGeneratedFiles = vi.fn(async () => []);

    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      overwriteExisting,
      writeGeneratedFiles,
    });

    expect(writeGeneratedFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        overwriteExisting,
      }),
    );
  });
});
