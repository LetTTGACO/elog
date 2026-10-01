import { afterEach, describe, expect, it, vi } from 'vitest';
import inquirer from 'inquirer';
import { runExportWizard, runInitWizard } from './wizard';
import { loadBuiltInPluginRegistry } from './registry';
import type { PluginRegistry } from './types';

const registry: PluginRegistry = {
  schemaVersion: 1,
  plugins: [
    {
      kind: 'from',
      type: 'test',
      displayName: 'Test source',
      packageName: '@elog/plugin-from-test',
      importName: 'fromTest',
      optionsSchema: {
        type: 'object',
        properties: { mode: { type: 'string', enum: ['fast', 'slow'] } },
      },
    },
    {
      kind: 'to',
      type: 'local',
      displayName: 'Local',
      packageName: '@elog/plugin-to-local',
      importName: 'toLocal',
      optionsSchema: { type: 'object' },
    },
  ],
};

afterEach(() => vi.restoreAllMocks());

describe('wizard prompt compatibility', () => {
  it.each([
    ['init', ''],
    ['init', 'image-local'],
    ['export', ''],
    ['export', 'image-local'],
  ] as const)('runs %s with optional single image selection %j', async (command, imageType) => {
    const prompt = inquirer.createPromptModule();
    for (const type of Object.keys(prompt.prompts)) {
      prompt.registerPrompt(type, async (question) => {
        const choices = question.choices as Array<{ value: string }> | undefined;
        if (question.message === '是否处理图片？') {
          expect(type).toBe('select');
          const value = imageType || question.default;
          expect(choices?.some((choice) => choice.value === value)).toBe(true);
          return value;
        }
        if (question.message === '你要发布到哪里？') {
          return type === 'checkbox' ? ['local'] : 'local';
        }
        return question.default ?? choices?.[0]?.value ?? '';
      });
    }
    vi.spyOn(inquirer, 'prompt').mockImplementation(prompt);

    const registry = loadBuiltInPluginRegistry();
    if (command === 'init') {
      const selection = await runInitWizard(registry);
      expect(selection.transforms.map((entry) => entry.type)).toEqual(imageType ? [imageType] : []);
    } else {
      const selection = await runExportWizard(registry);
      expect(selection.transforms.map(({ entry }) => entry.type)).toEqual(
        imageType ? [imageType] : [],
      );
    }
  });

  it('rejects an empty target selection at the target prompt before continuing', async () => {
    const prompt = inquirer.createPromptModule();
    let targetAccepted = false;
    prompt.registerPrompt('select', async (question) => {
      if (question.message === '是否处理图片？') {
        expect(targetAccepted).toBe(true);
        return '';
      }
      return 'test';
    });
    prompt.registerPrompt('checkbox', async (question) => {
      if (question.message === '你要发布到哪里？') {
        const validate = question.validate as (answer: string[]) => boolean | string;
        expect(validate).toBeTypeOf('function');
        expect(validate([])).toBe('请至少选择一个发布平台');
        expect(validate(['local'])).toBe(true);
        targetAccepted = true;
        return ['local'];
      }
      expect(targetAccepted).toBe(true);
      return [];
    });
    vi.spyOn(inquirer, 'prompt').mockImplementation(prompt);

    const selection = await runInitWizard(registry);
    expect(selection.to.map((entry) => entry.type)).toEqual(['local']);
    expect(selection.transforms).toEqual([]);
  });

  it.each(['init', 'export'] as const)(
    'runs %s with default selections and registered inquirer prompt types',
    async (command) => {
      const prompt = inquirer.createPromptModule();
      // 保留真实问题解析与类型校验，只替换终端交互，防止 mock 掩盖不支持的类型。
      for (const type of Object.keys(prompt.prompts)) {
        prompt.registerPrompt(type, async (question) => {
          const choices = question.choices as
            Array<{ value: string; checked?: boolean }> | undefined;
          const value = choices?.[0]?.value;
          return type === 'checkbox'
            ? (choices?.filter((choice) => choice.checked).map((choice) => choice.value) ?? [])
            : value;
        });
      }
      vi.spyOn(inquirer, 'prompt').mockImplementation(prompt);

      if (command === 'init') {
        const selection = await runInitWizard(registry);
        expect(selection.from.type).toBe('test');
        expect(selection.to.map((entry) => entry.type)).toEqual(['local']);
      } else {
        const selection = await runExportWizard(registry);
        expect(selection.from.answers).toEqual({ mode: 'fast' });
        expect(selection.to.entry.type).toBe('local');
      }
    },
  );
});
