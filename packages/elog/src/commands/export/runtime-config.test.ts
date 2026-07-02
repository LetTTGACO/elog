import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { ExportCommandError, buildExportRuntimeConfig } from './runtime-config';
import type { ExportSelection, PluginRegistryEntry } from '../init/types';

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
  packageName: '@elog/plugin-transform-image-local',
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

function createSelection(): ExportSelection {
  return {
    from: {
      entry: fromEntry,
      answers: {
        username: '1874@example.com',
        password: 'secret-password',
        login: '1874',
        repo: 'docs',
      },
    },
    transforms: [
      {
        entry: transformEntry,
        answers: { outputDir: './images' },
      },
    ],
    to: {
      entry: toEntry,
      answers: { outputDir: './docs' },
    },
  };
}

function writePluginPackage(cwd: string, packageName: string, pluginName: string, kind: string) {
  const packageDir = path.join(cwd, 'node_modules', ...packageName.split('/'));
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify({ name: packageName, type: 'module', main: 'index.js' }),
  );
  fs.writeFileSync(
    path.join(packageDir, 'index.js'),
    `export default function plugin() {
  return {
    name: ${JSON.stringify(pluginName)},
    kind: ${JSON.stringify(kind)},
    download() {},
    transform(docs) { return docs; },
    deploy() {}
  };
}
`,
  );
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
      username: '1874@example.com',
      password: 'secret-password',
      login: '1874',
      repo: 'docs',
    });
    expect(process.env.YUQUE_PWD).toBeUndefined();
  });

  it('resolves default plugin imports from the provided cwd', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-export-runtime-'));
    writePluginPackage(cwd, fromEntry.packageName, 'from:yuque-pwd', 'from');
    writePluginPackage(cwd, transformEntry.packageName, 'transform:image-local', 'transform');
    writePluginPackage(cwd, toEntry.packageName, 'to:local', 'to');

    const config = await buildExportRuntimeConfig(createSelection(), { cwd });

    expect(config.from.name).toBe('from:yuque-pwd');
    expect(config.plugins?.[0]?.name).toBe('transform:image-local');
    expect(Array.isArray(config.to)).toBe(false);
    expect(config.to).toMatchObject({ name: 'to:local' });
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
