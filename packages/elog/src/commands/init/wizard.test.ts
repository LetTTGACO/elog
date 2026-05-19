import { describe, expect, it, vi } from 'vitest';
import inquirer from 'inquirer';
import { buildOptionQuestions, buildPluginChoice, withHiddenDefaults } from './wizard';
import { InitCommandError } from './registry';
import type { PluginRegistry, PluginRegistryEntry } from './types';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

const yuque: PluginRegistryEntry = {
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
        'x-elog-prompt': { type: 'password', message: '请输入语雀 Token' },
      },
      onlyPublic: {
        type: 'boolean',
        default: false,
        'x-elog-prompt': { type: 'confirm', message: '是否只同步公开文章？' },
      },
      hiddenValue: {
        type: 'string',
        default: 'hidden',
        'x-elog-hidden': true,
      },
    },
    additionalProperties: false,
  },
};

const localTarget: PluginRegistryEntry = {
  kind: 'to',
  type: 'local',
  displayName: '本地目录',
  packageName: '@elogx-test/plugin-to-local',
  importName: 'toLocal',
  optionsSchema: {
    type: 'object',
    properties: {
      outputDir: {
        type: 'string',
        default: './docs',
        'x-elog-prompt': { type: 'input', message: '请输入文档输出目录' },
      },
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
      outputDir: {
        type: 'string',
        default: './images',
        'x-elog-prompt': { type: 'input', message: '请输入图片输出目录' },
      },
    },
    additionalProperties: false,
  },
};

const registry: PluginRegistry = {
  schemaVersion: 1,
  plugins: [yuque, imageLocal, localTarget],
};

describe('buildPluginChoice', () => {
  it('builds an inquirer choice from a plugin entry', () => {
    expect(buildPluginChoice(yuque)).toEqual({
      name: '语雀',
      value: 'yuque-token',
    });
  });
});

describe('buildOptionQuestions', () => {
  it('builds questions from schema properties', () => {
    expect(buildOptionQuestions(yuque)).toEqual([
      {
        type: 'password',
        name: 'token',
        message: '请输入语雀 Token',
        default: undefined,
      },
      {
        type: 'confirm',
        name: 'onlyPublic',
        message: '是否只同步公开文章？',
        default: false,
      },
    ]);
  });

  it('produces a list type question for enum properties', () => {
    const entry: PluginRegistryEntry = {
      kind: 'from',
      type: 'test-enum',
      displayName: 'Enum Test',
      packageName: '@elogx-test/plugin-from-enum',
      importName: 'fromEnum',
      optionsSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            title: 'Mode',
            enum: ['fast', 'slow'],
          },
        },
        additionalProperties: false,
      },
    };
    expect(buildOptionQuestions(entry)).toEqual([
      {
        type: 'list',
        name: 'mode',
        message: 'Mode',
        default: undefined,
        choices: ['fast', 'slow'],
      },
    ]);
  });

  it('produces a number type question for number properties', () => {
    const entry: PluginRegistryEntry = {
      kind: 'from',
      type: 'test-number',
      displayName: 'Number Test',
      packageName: '@elogx-test/plugin-from-number',
      importName: 'fromNumber',
      optionsSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            title: 'Limit',
            default: 10,
          },
        },
        additionalProperties: false,
      },
    };
    expect(buildOptionQuestions(entry)).toEqual([
      {
        type: 'number',
        name: 'limit',
        message: 'Limit',
        default: 10,
      },
    ]);
  });

  it('produces a password type for secret properties without x-elog-prompt', () => {
    const entry: PluginRegistryEntry = {
      kind: 'from',
      type: 'test-secret',
      displayName: 'Secret Test',
      packageName: '@elogx-test/plugin-from-secret',
      importName: 'fromSecret',
      optionsSchema: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            title: 'API Key',
            'x-elog-secret': true,
          },
        },
        additionalProperties: false,
      },
    };
    expect(buildOptionQuestions(entry)).toEqual([
      {
        type: 'password',
        name: 'apiKey',
        message: 'API Key',
        default: undefined,
      },
    ]);
  });

  it('produces an input type for plain string properties', () => {
    const entry: PluginRegistryEntry = {
      kind: 'from',
      type: 'test-string',
      displayName: 'String Test',
      packageName: '@elogx-test/plugin-from-string',
      importName: 'fromString',
      optionsSchema: {
        type: 'object',
        properties: {
          workspace: {
            type: 'string',
            title: 'Workspace',
          },
        },
        additionalProperties: false,
      },
    };
    expect(buildOptionQuestions(entry)).toEqual([
      {
        type: 'input',
        name: 'workspace',
        message: 'Workspace',
        default: undefined,
      },
    ]);
  });
});

describe('withHiddenDefaults', () => {
  it('merges hidden property defaults into answers', () => {
    const answers = { token: 'my-token' };
    const result = withHiddenDefaults(yuque, answers);
    expect(result.token).toBe('my-token');
    expect(result.hiddenValue).toBe('hidden');
  });

  it('gives user-provided answers priority over hidden defaults', () => {
    const answers = { token: 'my-token', hiddenValue: 'custom' };
    const result = withHiddenDefaults(yuque, answers);
    expect(result.hiddenValue).toBe('custom');
  });

  it('does not affect non-hidden properties', () => {
    const answers = { token: 'my-token' };
    const result = withHiddenDefaults(yuque, answers);
    expect(result.onlyPublic).toBe(false);
  });
});

describe('InitCommandError for PLUGIN_SELECTION_EMPTY', () => {
  it('is an InitCommandError with the correct code', async () => {
    const inquirer = await import('inquirer');
    const prompt = vi.mocked(inquirer.default.prompt);
    prompt
      .mockResolvedValueOnce({ from: 'notion' })
      .mockResolvedValueOnce({ to: [] })
      .mockResolvedValueOnce({ transforms: [] });

    const { runInitWizard } = await import('./wizard');
    const { loadBuiltInPluginRegistry } = await import('./registry');
    const registry = loadBuiltInPluginRegistry();

    try {
      await runInitWizard(registry);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InitCommandError);
      expect((error as InitCommandError).code).toBe('PLUGIN_SELECTION_EMPTY');
    }

    vi.restoreAllMocks();
  });
});

describe('runPluginSelectionWizard', () => {
  it('asks only plugin selection questions and returns selected entries', async () => {
    const prompt = vi.mocked(inquirer.prompt);
    prompt
      .mockResolvedValueOnce({ from: 'yuque-token' })
      .mockResolvedValueOnce({ to: ['local'] })
      .mockResolvedValueOnce({ transforms: ['image-local'] });

    const { runPluginSelectionWizard } = await import('./wizard');
    const selection = await runPluginSelectionWizard(registry);

    expect(selection.from).toBe(yuque);
    expect(selection.transforms).toEqual([imageLocal]);
    expect(selection.to).toEqual([localTarget]);
    expect(prompt).toHaveBeenCalledTimes(3);
    expect(prompt.mock.calls.flatMap((call) => call[0] as unknown[])).not.toContainEqual(
      expect.objectContaining({ name: 'token' }),
    );
  });

  it('throws PLUGIN_SELECTION_EMPTY when no target is selected', async () => {
    const prompt = vi.mocked(inquirer.prompt);
    prompt
      .mockResolvedValueOnce({ from: 'yuque-token' })
      .mockResolvedValueOnce({ to: [] })
      .mockResolvedValueOnce({ transforms: [] });

    const { runPluginSelectionWizard } = await import('./wizard');

    await expect(runPluginSelectionWizard(registry)).rejects.toMatchObject({
      code: 'PLUGIN_SELECTION_EMPTY',
    });
  });
});

describe('runExportWizard', () => {
  it('selects plugins and then asks selected plugin option questions', async () => {
    const prompt = vi.mocked(inquirer.prompt);
    prompt
      .mockResolvedValueOnce({ from: 'yuque-token' })
      .mockResolvedValueOnce({ to: ['local'] })
      .mockResolvedValueOnce({ transforms: [] })
      .mockResolvedValueOnce({ token: 'secret-token', onlyPublic: true })
      .mockResolvedValueOnce({ outputDir: './exported-docs' });

    const { runExportWizard } = await import('./wizard');
    const selection = await runExportWizard(registry);

    expect(selection.from.entry).toBe(yuque);
    expect(selection.from.answers).toMatchObject({
      token: 'secret-token',
      onlyPublic: true,
      hiddenValue: 'hidden',
    });
    expect(selection.transforms).toEqual([]);
    expect(selection.to[0]?.entry).toBe(localTarget);
    expect(selection.to[0]?.answers).toEqual({ outputDir: './exported-docs' });
    expect(prompt).toHaveBeenCalledTimes(5);
  });
});
