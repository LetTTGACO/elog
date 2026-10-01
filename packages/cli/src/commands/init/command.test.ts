import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import packageJson from '../../../package.json' with { type: 'json' };
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
  let cwd: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-init-command-'));
  });
  afterEach(() => fs.rmSync(cwd, { recursive: true, force: true }));

  const baseOptions: Omit<RunInitCommandOptions, 'dryRun'> = {
    get cwd() {
      return cwd;
    },
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
    expect(output).toContain('npm install');
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

  it('without dryRun: reports the generated config', async () => {
    const log = vi.fn();

    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      log,
    });

    expect(log).toHaveBeenCalledWith('已生成配置文件 elog.config.ts');
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
      expect.objectContaining({
        cwd,
        packages: [
          `@elog/cli@${packageJson.version}`,
          '@elog/plugin-from-notion',
          '@elog/plugin-transform-image-local',
          '@elog/plugin-to-local',
        ],
      }),
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

  it('declines overwrite before running the wizard or installing packages', async () => {
    fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');
    const runWizard = vi.fn(async () => sampleSelection);
    const installPackages = vi.fn();
    await expect(
      runInitCommand({
        ...baseOptions,
        dryRun: false,
        runWizard,
        installPackages,
        writeGeneratedFiles: undefined,
        overwriteExisting: async () => false,
      }),
    ).rejects.toMatchObject({ code: 'CONFIG_EXISTS_ABORTED' });
    expect(runWizard).not.toHaveBeenCalled();
    expect(installPackages).not.toHaveBeenCalled();
    expect(fs.readdirSync(cwd)).toEqual(['elog.config.ts']);
    expect(fs.readFileSync(path.join(cwd, 'elog.config.ts'), 'utf8')).toBe('old config');
  });

  it.each(['missing/elog.config.ts', '', '   ', 'directory'])(
    'rejects invalid config path %j before the wizard or installation',
    async (configName) => {
      fs.mkdirSync(path.join(cwd, 'directory'));
      const runWizard = vi.fn(async () => sampleSelection);
      const installPackages = vi.fn();
      await expect(
        runInitCommand({
          ...baseOptions,
          configName,
          dryRun: false,
          runWizard,
          installPackages,
          overwriteExisting: async () => true,
          writeGeneratedFiles: undefined,
        }),
      ).rejects.toMatchObject({ code: 'CONFIG_PATH_INVALID' });
      expect(runWizard).not.toHaveBeenCalled();
      expect(installPackages).not.toHaveBeenCalled();
    },
  );

  it('confirms once before installation and backs up the existing config when writing', async () => {
    fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');
    const events: string[] = [];
    const overwriteExisting = vi.fn(async () => {
      events.push('confirm');
      return true;
    });
    await runInitCommand({
      ...baseOptions,
      dryRun: false,
      writeGeneratedFiles: undefined,
      overwriteExisting,
      installPackages: () => {
        events.push('install');
        return { command: 'pnpm', args: [], display: '' };
      },
    });
    expect(events).toEqual(['confirm', 'install']);
    expect(overwriteExisting).toHaveBeenCalledTimes(1);
    const backup = fs.readdirSync(cwd).find((name) => name.includes('.backup.'))!;
    expect(fs.readFileSync(path.join(cwd, backup), 'utf8')).toBe('old config');
    expect(fs.readFileSync(path.join(cwd, 'elog.config.ts'), 'utf8')).toContain("from '@elog/cli'");
  });

  it('includes the current CLI in dry-run installation without confirming overwrite', async () => {
    fs.writeFileSync(path.join(cwd, 'elog.config.ts'), 'old config');
    const overwriteExisting = vi.fn();
    const log = vi.fn();
    await runInitCommand({ ...baseOptions, dryRun: true, overwriteExisting, log });
    expect(log.mock.calls[0]?.[0]).toContain(`npm install @elog/cli@${packageJson.version}`);
    expect(overwriteExisting).not.toHaveBeenCalled();
    expect(fs.readdirSync(cwd)).toEqual(['elog.config.ts']);
  });

  it('creates env placeholders and gitignore, then only appends new variables on repeat init', async () => {
    const from = {
      ...sampleSelection.from,
      optionsSchema: {
        type: 'object' as const,
        properties: {
          token: { type: 'string' as const, title: '访问令牌', 'x-elog-env': 'TOKEN' },
          shared: { type: 'string' as const, 'x-elog-env': 'TOKEN' },
        },
      },
    };
    const selection = { ...sampleSelection, from };
    const log = vi.fn();
    const options = {
      ...baseOptions,
      dryRun: false,
      writeGeneratedFiles: undefined,
      runWizard: async () => selection,
      overwriteExisting: async () => true,
      log,
    };
    await runInitCommand(options);
    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toContain('# 访问令牌\nTOKEN=\n');
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('/.env\n');
    const existing = '# Existing\nTOKEN=keep-me\n';
    fs.writeFileSync(path.join(cwd, '.env'), existing);
    selection.to = [
      {
        ...sampleSelection.to[0]!,
        optionsSchema: {
          type: 'object',
          properties: {
            endpoint: {
              type: 'string',
              title: '站点地址',
              description: '填写完整 URL',
              'x-elog-env': 'ENDPOINT',
            },
          },
        },
      },
    ];
    await runInitCommand(options);
    const updatedEnv = fs.readFileSync(path.join(cwd, '.env'), 'utf8');
    expect(updatedEnv.startsWith(existing)).toBe(true);
    expect(updatedEnv).toContain(
      '# 获取与配置教程：https://elog.1874.cool/notion/gvnxobqogetukays',
    );
    expect(updatedEnv).toContain('# 站点地址\n# 填写完整 URL\nENDPOINT=\n');
    expect(fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8')).toBe('/.env\n');
    expect(JSON.stringify(log.mock.calls)).not.toContain('keep-me');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('-e .env'));
  });

  it('previews only missing env names without changing env or gitignore', async () => {
    fs.writeFileSync(path.join(cwd, '.env'), 'NOTION_TOKEN=keep-me\n');
    const log = vi.fn();
    await runInitCommand({ cwd, configName: 'elog.config.ts', dryRun: true, log });
    expect(log.mock.calls[0]?.[0]).toContain('# Notion Data Source ID\nNOTION_DATA_SOURCE_ID=');
    expect(log.mock.calls[0]?.[0]).not.toContain('keep-me');
    expect(fs.readdirSync(cwd)).toEqual(['.env']);
    expect(fs.readFileSync(path.join(cwd, '.env'), 'utf8')).toBe('NOTION_TOKEN=keep-me\n');
  });

  it.each(['.env', '.gitignore'])(
    'rejects an unusable %s before installation',
    async (filename) => {
      fs.mkdirSync(path.join(cwd, filename));
      const installPackages = vi.fn();
      const { loadBuiltInPluginRegistry } = await import('./registry');
      const { createDefaultInitSelection } = await import('./command');
      await expect(
        runInitCommand({
          ...baseOptions,
          dryRun: false,
          runWizard: async () => createDefaultInitSelection(loadBuiltInPluginRegistry()),
          installPackages,
        }),
      ).rejects.toThrow();
      expect(installPackages).not.toHaveBeenCalled();
      expect(fs.existsSync(path.join(cwd, 'elog.config.ts'))).toBe(false);
    },
  );

  it.each(['.env', '.gitignore'])(
    'prevents config generation from overwriting %s',
    async (configName) => {
      const installPackages = vi.fn();
      await expect(
        runInitCommand({ ...baseOptions, configName, dryRun: false, installPackages }),
      ).rejects.toMatchObject({ code: 'CONFIG_PATH_INVALID' });
      expect(installPackages).not.toHaveBeenCalled();
    },
  );

  it.each(['dependencies', 'devDependencies'])(
    'preserves an existing CLI version in %s',
    async (field) => {
      fs.writeFileSync(
        path.join(cwd, 'package.json'),
        JSON.stringify({ [field]: { '@elog/cli': '^1.0.0-beta.1' } }),
      );
      const installPackages = vi.fn();
      await runInitCommand({ ...baseOptions, dryRun: false, installPackages });
      expect(installPackages.mock.calls[0]?.[0].packages).toEqual(
        selectedPackages(sampleSelection),
      );
    },
  );
});
