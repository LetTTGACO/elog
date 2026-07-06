import { describe, expect, it } from 'vitest';
import { generateInitFiles, renderObjectLiteral } from './generator';
import { loadBuiltInPluginRegistry } from './registry';
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
      configText: `import { defineConfig } from '@elog/cli';
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
    const toHalo: PluginRegistryEntry = {
      kind: 'to',
      type: 'halo',
      displayName: 'Halo',
      packageName: '@elog/plugin-to-halo',
      importName: 'toHalo',
      optionsSchema: {
        type: 'object',
        properties: {
          apiUrl: { type: 'string', 'x-elog-env': 'HALO_API_URL' },
        },
        additionalProperties: false,
      },
    };

    const selection: PluginSelection = {
      from: fromYuque,
      transforms: [],
      to: [toLocal, toHalo],
    };

    const files = generateInitFiles(selection);

    expect(files.configText).toContain('to: [');
    expect(files.configText).toContain('toLocal(');
    expect(files.configText).toContain('toHalo(');
    expect(files.configText).toContain('apiUrl: process.env.HALO_API_URL');
  });

  it('generates explicit CMS body-transform workflows from built-in registry entries', () => {
    const registry = loadBuiltInPluginRegistry();
    const byKey = (kind: PluginRegistryEntry['kind'], type: string) => {
      const entry = registry.plugins.find((plugin) => plugin.kind === kind && plugin.type === type);
      expect(entry).toBeDefined();
      return entry!;
    };

    const htmlWorkflow = generateInitFiles({
      from: byKey('from', 'notion'),
      transforms: [byKey('transform', 'markdown-to-html')],
      to: [byKey('to', 'halo'), byKey('to', 'wordpress')],
    });
    const confluenceWorkflow = generateInitFiles({
      from: byKey('from', 'notion'),
      transforms: [byKey('transform', 'markdown-to-confluence-wiki')],
      to: [byKey('to', 'confluence')],
    });

    expect(htmlWorkflow.configText).toContain(
      "import markdownToHtml from '@elog/plugin-transform-markdown-to-html';",
    );
    expect(htmlWorkflow.configText).toContain("import toHalo from '@elog/plugin-to-halo';");
    expect(htmlWorkflow.configText).toContain(
      "import toWordPress from '@elog/plugin-to-wordpress';",
    );
    expect(htmlWorkflow.configText).toContain(`plugins: [
    markdownToHtml({}),
  ],`);
    expect(htmlWorkflow.configText).toContain(`toHalo({
      endpoint: process.env.HALO_ENDPOINT,
      token: process.env.HALO_TOKEN,
    })`);
    expect(htmlWorkflow.configText).toContain(`toWordPress({
      endpoint: process.env.WORDPRESS_ENDPOINT,
      username: process.env.WORDPRESS_USERNAME,
      password: process.env.WORDPRESS_PASSWORD,
    })`);
    expect(htmlWorkflow.configText).not.toContain('markdown:');
    expect(htmlWorkflow.configText).not.toContain('formatExt');

    expect(confluenceWorkflow.configText).toContain(
      "import markdownToConfluenceWiki from '@elog/plugin-transform-markdown-to-confluence-wiki';",
    );
    expect(confluenceWorkflow.configText).toContain(
      "import toConfluence from '@elog/plugin-to-confluence';",
    );
    expect(confluenceWorkflow.configText).toContain(`plugins: [
    markdownToConfluenceWiki({}),
  ],`);
    expect(confluenceWorkflow.configText).toContain(`to: toConfluence({
    user: process.env.CONFLUENCE_USER,
    password: process.env.CONFLUENCE_PASSWORD,
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY,
    rootPageId: process.env.CONFLUENCE_ROOT_PAGE_ID,
  }),`);
    expect(confluenceWorkflow.configText).not.toContain('formatExt');
  });

  it('generates config for every 1.0 stable registry entry', () => {
    const registry = loadBuiltInPluginRegistry();
    const byKey = (kind: PluginRegistryEntry['kind'], type: string) => {
      const entry = registry.plugins.find((plugin) => plugin.kind === kind && plugin.type === type);
      expect(entry).toBeDefined();
      return entry!;
    };
    const files = generateInitFiles({
      from: byKey('from', 'yuque-token'),
      transforms: [
        'image-local',
        'image-cos',
        'image-oss',
        'image-github',
        'image-qiniu',
        'image-upyun',
        'image-r2',
        'image-b2',
        'markdown-to-html',
        'markdown-to-confluence-wiki',
      ].map((type) => byKey('transform', type)),
      to: [
        byKey('to', 'local'),
        byKey('to', 'halo'),
        byKey('to', 'wordpress'),
        byKey('to', 'confluence'),
      ],
    });

    expect(files.configText).toContain("import yuqueToken from '@elog/plugin-from-yuque-token';");
    expect(files.configText).toContain(
      "import imageLocal from '@elog/plugin-transform-image-local';",
    );
    expect(files.configText).toContain("import imageCos from '@elog/plugin-transform-image-cos';");
    expect(files.configText).toContain("import imageOss from '@elog/plugin-transform-image-oss';");
    expect(files.configText).toContain(
      "import imageGithub from '@elog/plugin-transform-image-github';",
    );
    expect(files.configText).toContain(
      "import imageQiniu from '@elog/plugin-transform-image-qiniu';",
    );
    expect(files.configText).toContain(
      "import imageUpyun from '@elog/plugin-transform-image-upyun';",
    );
    expect(files.configText).toContain("import imageR2 from '@elog/plugin-transform-image-r2';");
    expect(files.configText).toContain("import imageB2 from '@elog/plugin-transform-image-b2';");
    expect(files.configText).toContain(
      "import markdownToHtml from '@elog/plugin-transform-markdown-to-html';",
    );
    expect(files.configText).toContain(
      "import markdownToConfluenceWiki from '@elog/plugin-transform-markdown-to-confluence-wiki';",
    );
    expect(files.configText).toContain("import toLocal from '@elog/plugin-to-local';");
    expect(files.configText).toContain("import toHalo from '@elog/plugin-to-halo';");
    expect(files.configText).toContain("import toWordPress from '@elog/plugin-to-wordpress';");
    expect(files.configText).toContain("import toConfluence from '@elog/plugin-to-confluence';");

    expect(files.configText).toContain('process.env.YUQUE_TOKEN');
    expect(files.configText).toContain('process.env.COS_SECRET_ID');
    expect(files.configText).toContain('process.env.OSS_SECRET_ID');
    expect(files.configText).toContain('process.env.GITHUB_TOKEN');
    expect(files.configText).toContain('process.env.QINIU_SECRET_ID');
    expect(files.configText).toContain('process.env.UPYUN_PASSWORD');
    expect(files.configText).toContain('process.env.R2_ACCESS_KEY_ID');
    expect(files.configText).toContain('process.env.B2_APPLICATION_KEY_ID');
    expect(files.configText).toContain('process.env.HALO_ENDPOINT');
    expect(files.configText).toContain('process.env.WORDPRESS_ENDPOINT');
    expect(files.configText).toContain('process.env.CONFLUENCE_BASE_URL');
  });
});
