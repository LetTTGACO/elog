import { describe, expect, it } from 'vitest';
import { generateInitFiles, renderObjectLiteral } from './generator';
import type { PluginRegistryEntry, PluginSelection } from './types';

const fromYuque: PluginRegistryEntry = {
  kind: 'from',
  type: 'yuque-pwd',
  displayName: '语雀',
  packageName: '@elog/plugin-from-yuque-pwd',
  importName: 'fromYuque',
  optionsSchema: {
    type: 'object',
    properties: {
      username: { type: 'string', 'x-elog-env': 'YUQUE_USERNAME' },
      password: { type: 'string', 'x-elog-env': 'YUQUE_PWD', 'x-elog-secret': true },
      login: { type: 'string', 'x-elog-env': 'YUQUE_LOGIN' },
      repo: { type: 'string', 'x-elog-env': 'YUQUE_REPO' },
      onlyPublic: { type: 'boolean', default: false },
      space: { type: 'string' },
    },
    additionalProperties: false,
  },
};

const imageLocal: PluginRegistryEntry = {
  kind: 'transform',
  type: 'image-local',
  displayName: '下载图片到本地',
  packageName: '@elog/plugin-transform-image-local',
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
  packageName: '@elog/plugin-to-local',
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
          username: '1874@example.com',
          password: 'secret',
          login: '1874',
          repo: 'my-repo',
          onlyPublic: false,
        },
        fromYuque.optionsSchema,
      ),
    ).toBe(`{
  username: process.env.YUQUE_USERNAME,
  password: process.env.YUQUE_PWD,
  login: process.env.YUQUE_LOGIN,
  repo: process.env.YUQUE_REPO,
  onlyPublic: false,
}`);
  });
});

describe('generateInitFiles', () => {
  it('generates config text from selected plugins and schema defaults', () => {
    const selection: PluginSelection = {
      from: fromYuque,
      transforms: [imageLocal],
      to: [toLocal],
    };

    const files = generateInitFiles(selection);

    expect(files).toEqual({
      configText: `import { defineConfig } from '@elog/core';
import fromYuque from '@elog/plugin-from-yuque-pwd';
import imageLocal from '@elog/plugin-transform-image-local';
import toLocal from '@elog/plugin-to-local';

export default defineConfig({
  from: fromYuque({
    username: process.env.YUQUE_USERNAME,
    password: process.env.YUQUE_PWD,
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
    const toRemote: PluginRegistryEntry = {
      kind: 'to',
      type: 'remote',
      displayName: 'Remote',
      packageName: '@elog/plugin-to-remote',
      importName: 'toRemote',
      optionsSchema: {
        type: 'object',
        properties: {
          apiUrl: { type: 'string', 'x-elog-env': 'REMOTE_API_URL' },
        },
        additionalProperties: false,
      },
    };

    const selection: PluginSelection = {
      from: fromYuque,
      transforms: [],
      to: [toLocal, toRemote],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).toContain('to: [');
    expect(files.configText).toContain('toLocal(');
    expect(files.configText).toContain('toRemote(');
    expect(files.configText).toContain('apiUrl: process.env.REMOTE_API_URL');
  });
});
