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
    const transformPlugin = {
      name: 'transform:image-local',
      kind: 'transform' as const,
      transform: vi.fn(),
    };
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
    expect(config.disableCacheWrite).toBe(true);
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
      {
        entry: { ...toEntry, packageName: '@elogx-test/plugin-to-local-a' },
        answers: { outputDir: './a' },
      },
      {
        entry: { ...toEntry, packageName: '@elogx-test/plugin-to-local-b' },
        answers: { outputDir: './b' },
      },
    ];
    const loadPlugin = vi.fn(async (packageName: string) => {
      if (packageName === fromEntry.packageName) {
        return vi.fn(() => ({ name: 'from:yuque', kind: 'from' as const, download: vi.fn() }));
      }
      if (packageName === transformEntry.packageName) {
        return vi.fn(() => ({
          name: 'transform:image-local',
          kind: 'transform' as const,
          transform: vi.fn(),
        }));
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

    await expect(buildExportRuntimeConfig(createSelection(), { loadPlugin })).rejects.toMatchObject(
      {
        code: 'EXPORT_PLUGIN_IMPORT_FAILED',
      },
    );
  });

  it('wraps factory failures as ExportCommandError', async () => {
    const loadPlugin = vi.fn(async () => {
      return vi.fn(() => {
        throw new Error('bad options');
      });
    });

    await expect(buildExportRuntimeConfig(createSelection(), { loadPlugin })).rejects.toMatchObject(
      {
        code: 'EXPORT_PLUGIN_FACTORY_FAILED',
      },
    );
  });

  it('exposes stable export error codes', () => {
    const error = new ExportCommandError('EXPORT_PLUGIN_IMPORT_FAILED', 'Import failed');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ExportCommandError');
    expect(error.code).toBe('EXPORT_PLUGIN_IMPORT_FAILED');
  });
});
