import { describe, expect, it } from 'vitest';
import { InitCommandError } from './registry';
import { getPluginsByKind, loadBuiltInPluginRegistry, parsePluginRegistry } from './registry';

describe('loadBuiltInPluginRegistry', () => {
  it('loads the built-in registry without errors', () => {
    const registry = loadBuiltInPluginRegistry();
    expect(registry.schemaVersion).toBe(1);
    expect(registry.plugins.length).toBeGreaterThan(0);
  });
});

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

  it('rejects non-object input', () => {
    expect(() => parsePluginRegistry(null)).toThrow(InitCommandError);
    expect(() => parsePluginRegistry('string')).toThrow('Plugin registry must be an object.');
    expect(() => parsePluginRegistry(42)).toThrow('Plugin registry must be an object.');
  });

  it('rejects wrong schemaVersion', () => {
    expect(() => parsePluginRegistry({ schemaVersion: 2, plugins: [] })).toThrow(
      'Plugin registry schemaVersion must be 1.',
    );
    expect(() => parsePluginRegistry({ schemaVersion: '1', plugins: [] })).toThrow(
      'Plugin registry schemaVersion must be 1.',
    );
  });

  it('rejects non-array plugins', () => {
    expect(() => parsePluginRegistry({ schemaVersion: 1, plugins: {} })).toThrow(
      'Plugin registry plugins must be an array.',
    );
    expect(() => parsePluginRegistry({ schemaVersion: 1, plugins: 'not-array' })).toThrow(
      'Plugin registry plugins must be an array.',
    );
  });

  it('rejects entry missing required fields', () => {
    expect(() => parsePluginRegistry({ schemaVersion: 1, plugins: [{}] })).toThrow(
      'plugins[0].kind must be from, to, or transform.',
    );
  });

  it('rejects invalid kind value', () => {
    expect(() =>
      parsePluginRegistry({
        schemaVersion: 1,
        plugins: [
          {
            kind: 'invalid',
            type: 'test',
            displayName: 'Test',
            packageName: 'pkg',
            importName: 'fn',
            optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
          },
        ],
      }),
    ).toThrow('plugins[0].kind must be from, to, or transform.');
  });

  it('rejects empty string for required fields', () => {
    expect(() =>
      parsePluginRegistry({
        schemaVersion: 1,
        plugins: [
          {
            kind: 'from',
            type: '  ',
            displayName: 'Test',
            packageName: 'pkg',
            importName: 'fn',
            optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
          },
        ],
      }),
    ).toThrow('plugins[0].type must be a non-empty string.');
    expect(() =>
      parsePluginRegistry({
        schemaVersion: 1,
        plugins: [
          {
            kind: 'from',
            type: 'test',
            displayName: '',
            packageName: 'pkg',
            importName: 'fn',
            optionsSchema: { type: 'object', properties: {}, additionalProperties: false },
          },
        ],
      }),
    ).toThrow('plugins[0].displayName must be a non-empty string.');
  });

  it('rejects non-object optionsSchema', () => {
    expect(() =>
      parsePluginRegistry({
        schemaVersion: 1,
        plugins: [
          {
            kind: 'from',
            type: 'test',
            displayName: 'Test',
            packageName: 'pkg',
            importName: 'fn',
            optionsSchema: 'not-object',
          },
        ],
      }),
    ).toThrow('plugins[0].optionsSchema must be an object.');
    expect(() =>
      parsePluginRegistry({
        schemaVersion: 1,
        plugins: [
          {
            kind: 'from',
            type: 'test',
            displayName: 'Test',
            packageName: 'pkg',
            importName: 'fn',
            optionsSchema: null,
          },
        ],
      }),
    ).toThrow('plugins[0].optionsSchema must be an object.');
  });
});
