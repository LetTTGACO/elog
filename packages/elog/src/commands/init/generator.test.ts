import { describe, expect, it } from 'vitest';
import { generateInitFiles, renderEnvText, renderObjectLiteral } from './generator';
import type { InitSelection, PluginRegistryEntry } from './types';

const fromYuque: PluginRegistryEntry = {
  kind: 'from',
  type: 'yuque-token',
  displayName: '语雀',
  packageName: '@elogx-test/plugin-from-yuque-token',
  importName: 'fromYuque',
  optionsSchema: {
    type: 'object',
    properties: {
      token: { type: 'string', 'x-elog-env': 'YUQUE_TOKEN', 'x-elog-secret': true },
      login: { type: 'string', 'x-elog-env': 'YUQUE_LOGIN' },
      onlyPublic: { type: 'boolean', default: false },
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
      outputDir: { type: 'string', default: './images' },
    },
    additionalProperties: false,
  },
};

const toLocal: PluginRegistryEntry = {
  kind: 'to',
  type: 'local',
  displayName: '本地目录',
  packageName: '@elogx-test/plugin-to-local',
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
          token: 'secret',
          login: '1874',
          onlyPublic: false,
        },
        fromYuque.optionsSchema,
      ),
    ).toBe(`{
  token: process.env.YUQUE_TOKEN,
  login: process.env.YUQUE_LOGIN,
  onlyPublic: false,
}`);
  });
});

describe('renderEnvText', () => {
  it('renders env values and examples with stable ordering', () => {
    expect(
      renderEnvText([
        { name: 'YUQUE_TOKEN', value: 'secret' },
        { name: 'YUQUE_LOGIN', value: '1874' },
      ]),
    ).toBe('YUQUE_TOKEN=secret\nYUQUE_LOGIN=1874\n');
  });

  it('returns empty string for empty array', () => {
    expect(renderEnvText([])).toBe('');
    expect(renderEnvText([], false)).toBe('');
  });
});

describe('generateInitFiles', () => {
  it('generates config, env, and env example text', () => {
    const selection: InitSelection = {
      from: {
        entry: fromYuque,
        answers: { token: 'secret', login: '1874', onlyPublic: false },
      },
      transforms: [{ entry: imageLocal, answers: { outputDir: './images' } }],
      to: [{ entry: toLocal, answers: { outputDir: './docs', keepToc: true } }],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).toContain(
      "import fromYuque from '@elogx-test/plugin-from-yuque-token';",
    );
    expect(files.configText).toContain('token: process.env.YUQUE_TOKEN');
    expect(files.configText).toContain('plugins: [');
    expect(files.configText).toContain('to: toLocal(');
    expect(files.envText).toBe('YUQUE_TOKEN=secret\nYUQUE_LOGIN=1874\n');
    expect(files.envExampleText).toBe('YUQUE_TOKEN=\nYUQUE_LOGIN=\n');
  });

  it('formats generated config with nested plugin options indented cleanly', () => {
    const selection: InitSelection = {
      from: {
        entry: fromYuque,
        answers: { token: 'secret', login: '1874', onlyPublic: false },
      },
      transforms: [{ entry: imageLocal, answers: { outputDir: './images' } }],
      to: [{ entry: toLocal, answers: { outputDir: './docs', keepToc: true } }],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).toBe(`import { defineConfig } from '@elogx-test/elog';
import fromYuque from '@elogx-test/plugin-from-yuque-token';
import imageLocal from '@elogx-test/plugin-image-local';
import toLocal from '@elogx-test/plugin-to-local';

export default defineConfig({
  from: fromYuque({
    token: process.env.YUQUE_TOKEN,
    login: process.env.YUQUE_LOGIN,
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
`);
  });

  it('omits plugins key when there are zero transforms', () => {
    const selection: InitSelection = {
      from: {
        entry: fromYuque,
        answers: { token: 'secret', login: '1874', onlyPublic: false },
      },
      transforms: [],
      to: [{ entry: toLocal, answers: { outputDir: './docs', keepToc: true } }],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).not.toContain('plugins:');
    expect(files.configText).not.toContain('plugins: [');
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

    const selection: InitSelection = {
      from: {
        entry: fromYuque,
        answers: { token: 'secret', login: '1874', onlyPublic: false },
      },
      transforms: [],
      to: [
        { entry: toLocal, answers: { outputDir: './docs', keepToc: true } },
        { entry: toHalo, answers: { apiUrl: 'https://example.com' } },
      ],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).toContain('to: [');
    expect(files.configText).toContain('toLocal(');
    expect(files.configText).toContain('toHalo(');
    expect(files.configText).toContain('HALO_API_URL');
    expect(files.configText).toContain(']');
  });

  it('returns empty env text when there are no env values', () => {
    const fromNoEnv: PluginRegistryEntry = {
      kind: 'from',
      type: 'local',
      displayName: 'Local',
      packageName: '@elogx-test/plugin-from-local',
      importName: 'fromLocal',
      optionsSchema: {
        type: 'object',
        properties: {
          dir: { type: 'string', default: './notes' },
        },
        additionalProperties: false,
      },
    };

    const selection: InitSelection = {
      from: { entry: fromNoEnv, answers: { dir: './notes' } },
      transforms: [],
      to: [{ entry: toLocal, answers: { outputDir: './docs', keepToc: true } }],
    };

    const files = generateInitFiles(selection);

    expect(files.envText).toBe('');
    expect(files.envExampleText).toBe('');
  });
});
