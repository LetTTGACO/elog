import { describe, expect, it, vi } from 'vitest';
import { runExportCommand, selectedPackages } from './command';
import type { ElogConfig } from '../../types/common';
import type { WorkflowResult } from '../../runtime/types';
import type { ExportSelection, PluginRegistry, PluginRegistryEntry } from '../init/types';

const fromEntry: PluginRegistryEntry = {
  kind: 'from',
  type: 'yuque-pwd',
  displayName: '语雀',
  packageName: '@elog/plugin-from-yuque-pwd',
  importName: 'fromYuque',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

const transformEntry: PluginRegistryEntry = {
  kind: 'transform',
  type: 'image-local',
  displayName: '下载图片到本地',
  packageName: '@elog/plugin-image-local',
  importName: 'imageLocal',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

const toEntry: PluginRegistryEntry = {
  kind: 'to',
  type: 'local',
  displayName: '本地目录',
  packageName: '@elog/plugin-to-local',
  importName: 'toLocal',
  optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
};

const registry: PluginRegistry = {
  schemaVersion: 1,
  plugins: [fromEntry, transformEntry, toEntry],
};

const selection: ExportSelection = {
  from: {
    entry: fromEntry,
    answers: { username: '1874@example.com', password: 'secret-password' },
  },
  transforms: [{ entry: transformEntry, answers: { outputDir: './images' } }],
  to: { entry: toEntry, answers: { outputDir: './docs' } },
};

describe('selectedPackages', () => {
  it('extracts unique package names from export selection', () => {
    expect(selectedPackages(selection)).toEqual([
      '@elog/plugin-from-yuque-pwd',
      '@elog/plugin-image-local',
      '@elog/plugin-to-local',
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
          '@elog/plugin-from-yuque-pwd',
          '@elog/plugin-image-local',
          '@elog/plugin-to-local',
        ],
      }),
    );
    expect(buildRuntimeConfig).toHaveBeenCalledWith(selection, { cwd: '/tmp/project' });
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
        buildRuntimeConfig: vi.fn(async () => ({ disableCache: true }) as ElogConfig),
        runRuntime: vi.fn(async () => results),
        reportResults: vi.fn(),
        throwOnFailed: () => {
          throw error;
        },
      }),
    ).rejects.toThrow(error);
  });
});
