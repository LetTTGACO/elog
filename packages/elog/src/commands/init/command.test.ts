import { describe, expect, it, vi } from 'vitest';
import { createInitDryRunOutput, runInitCommand, selectedPackages } from './command';
import type { RunInitCommandOptions } from './command';
import type { GeneratedInitFiles, PluginRegistry, PluginSelection } from './types';

const sampleRegistry: PluginRegistry = {
  schemaVersion: 1,
  plugins: [
    {
      kind: 'from',
      type: 'from:notion',
      displayName: 'Notion',
      packageName: '@elog/plugin-from-notion',
      importName: 'notion',
      optionsSchema: { type: 'object', properties: {} },
    },
    {
      kind: 'transform',
      type: 'transform:image-local',
      displayName: 'Local Images',
      packageName: '@elog/plugin-transform-image-local',
      importName: 'imageLocal',
      optionsSchema: { type: 'object', properties: {} },
    },
    {
      kind: 'to',
      type: 'to:local',
      displayName: 'Local',
      packageName: '@elog/plugin-to-local',
      importName: 'toLocal',
      optionsSchema: { type: 'object', properties: {} },
    },
  ],
};

const sampleSelection: PluginSelection = {
  from: sampleRegistry.plugins[0]!,
  transforms: [sampleRegistry.plugins[1]!],
  to: [sampleRegistry.plugins[2]!],
};

const sampleFiles: GeneratedInitFiles = {
  configText: "import { defineConfig } from '@elog/cli';\n",
};

describe('createInitDryRunOutput', () => {
  it('prints install command and config only', () => {
    const input = { ...sampleFiles, installCommand: 'pnpm add @elog/plugin-from-notion' };
    const output = createInitDryRunOutput(input);

    expect(output).toContain('pnpm add @elog/plugin-from-notion');
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

describe('selectedPackages', () => {
  it('extracts unique package names from all plugin kinds', () => {
    const packages = selectedPackages(sampleSelection);
    expect(packages).toEqual([
      '@elog/plugin-from-notion',
      '@elog/plugin-transform-image-local',
      '@elog/plugin-to-local',
    ]);
  });

  it('deduplicates when the same package appears in multiple kinds', () => {
    const selection: PluginSelection = {
      from: sampleRegistry.plugins[0]!,
      transforms: [],
      to: [sampleRegistry.plugins[0]!],
    };
    const packages = selectedPackages(selection);
    expect(packages).toEqual(['@elog/plugin-from-notion']);
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
    log: vi.fn(),
  };

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

  it('without dryRun: logs a config generated security reminder', async () => {
    const log = vi.fn();

    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      log,
    });

    expect(log).toHaveBeenCalledWith(
      '已生成配置文件 elog.config.ts；推荐将 Token 等隐私参数写入 .env 文件，并将 .env 加入 .gitignore。',
    );
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
