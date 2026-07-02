import { describe, expect, it } from 'vitest';
import { InitCommandError } from './registry';
import { getPluginsByKind, loadBuiltInPluginRegistry, parsePluginRegistry } from './registry';

describe('loadBuiltInPluginRegistry', () => {
  it('loads the built-in registry without errors', () => {
    const registry = loadBuiltInPluginRegistry();
    expect(registry.schemaVersion).toBe(1);
    expect(registry.plugins.length).toBeGreaterThan(0);
  });

  it('uses Notion as the first built-in source for the local golden path', () => {
    const registry = loadBuiltInPluginRegistry();
    const fromPlugins = getPluginsByKind(registry, 'from');

    expect(fromPlugins[0]).toMatchObject({
      kind: 'from',
      type: 'notion',
      displayName: 'Notion',
      packageName: '@elogx-test/plugin-from-notion',
      importName: 'notion',
    });
  });

  it('prompts Notion setup for dataSourceId while keeping legacy databaseId', () => {
    const registry = loadBuiltInPluginRegistry();
    const notion = registry.plugins.find(
      (plugin) => plugin.kind === 'from' && plugin.type === 'notion',
    );

    expect(notion).toMatchObject({
      optionsSchema: {
        required: ['token'],
        properties: {
          token: expect.any(Object),
          dataSourceId: {
            title: 'Notion Data Source ID',
            'x-elog-env': 'NOTION_DATA_SOURCE_ID',
            'x-elog-prompt': {
              type: 'input',
              message: '请输入 Notion Data Source ID',
            },
          },
          databaseId: {
            title: 'Notion Database ID',
            'x-elog-env': 'NOTION_DATABASE_ID',
            'x-elog-prompt': {
              type: 'input',
              message: '请输入 Notion Database ID',
            },
          },
        },
      },
    });
  });

  it('prompts Yuque password mode for latexCode', () => {
    const registry = loadBuiltInPluginRegistry();
    const yuquePwd = registry.plugins.find(
      (plugin) => plugin.kind === 'from' && plugin.type === 'yuque-pwd',
    );

    expect(yuquePwd).toMatchObject({
      optionsSchema: {
        properties: {
          latexCode: {
            title: '转换语雀 LaTeX 公式',
            default: false,
            'x-elog-prompt': {
              type: 'confirm',
              message: '是否转换语雀 LaTeX 公式？',
            },
          },
        },
      },
    });
  });

  it('includes the Notion, image-local, and local init registry entries', () => {
    const registry = loadBuiltInPluginRegistry();

    expect(registry.plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'from', type: 'notion' }),
        expect.objectContaining({ kind: 'transform', type: 'image-local' }),
        expect.objectContaining({ kind: 'to', type: 'local' }),
      ]),
    );
  });

  it('includes all 1.0 stable plugin registry entries', () => {
    const stableEntries = [
      {
        kind: 'from',
        type: 'notion',
        packageName: '@elogx-test/plugin-from-notion',
        importName: 'notion',
      },
      {
        kind: 'from',
        type: 'yuque-token',
        packageName: '@elogx-test/plugin-from-yuque-token',
        importName: 'yuqueToken',
      },
      {
        kind: 'from',
        type: 'yuque-pwd',
        packageName: '@elogx-test/plugin-from-yuque-pwd',
        importName: 'fromYuque',
      },
      {
        kind: 'transform',
        type: 'image-local',
        packageName: '@elogx-test/plugin-image-local',
        importName: 'imageLocal',
      },
      {
        kind: 'transform',
        type: 'image-cos',
        packageName: '@elogx-test/plugin-image-cos',
        importName: 'imageCos',
      },
      {
        kind: 'transform',
        type: 'image-oss',
        packageName: '@elogx-test/plugin-image-oss',
        importName: 'imageOss',
      },
      {
        kind: 'transform',
        type: 'image-github',
        packageName: '@elogx-test/plugin-image-github',
        importName: 'imageGithub',
      },
      {
        kind: 'transform',
        type: 'image-qiniu',
        packageName: '@elogx-test/plugin-image-qiniu',
        importName: 'imageQiniu',
      },
      {
        kind: 'transform',
        type: 'image-upyun',
        packageName: '@elogx-test/plugin-image-upyun',
        importName: 'imageUpyun',
      },
      {
        kind: 'transform',
        type: 'image-r2',
        packageName: '@elogx-test/plugin-image-r2',
        importName: 'imageR2',
      },
      {
        kind: 'transform',
        type: 'image-b2',
        packageName: '@elogx-test/plugin-image-b2',
        importName: 'imageB2',
      },
      {
        kind: 'to',
        type: 'local',
        packageName: '@elogx-test/plugin-to-local',
        importName: 'toLocal',
      },
    ] as const;

    const registry = loadBuiltInPluginRegistry();
    expect(registry.plugins).toEqual(
      expect.arrayContaining(stableEntries.map((entry) => expect.objectContaining(entry))),
    );
  });
});

describe('parsePluginRegistry', () => {
  it('accepts official plugin registry entries', () => {
    const registry = parsePluginRegistry({
      schemaVersion: 1,
      plugins: [
        {
          kind: 'from',
          type: 'yuque-pwd',
          displayName: '语雀',
          packageName: '@elogx-test/plugin-from-yuque-pwd',
          importName: 'fromYuque',
          optionsSchema: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: {
                type: 'string',
                title: '语雀账号',
                'x-elog-env': 'YUQUE_USERNAME',
                'x-elog-prompt': {
                  type: 'input',
                  message: '请输入语雀账号',
                },
              },
              password: {
                type: 'string',
                title: '语雀密码',
                'x-elog-env': 'YUQUE_PWD',
                'x-elog-secret': true,
                'x-elog-prompt': {
                  type: 'password',
                  message: '请输入语雀密码',
                },
              },
              latexCode: {
                type: 'boolean',
                title: '转换语雀 LaTeX 公式',
                default: false,
                'x-elog-prompt': {
                  type: 'confirm',
                  message: '是否转换语雀 LaTeX 公式？',
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
      type: 'yuque-pwd',
      packageName: '@elogx-test/plugin-from-yuque-pwd',
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
