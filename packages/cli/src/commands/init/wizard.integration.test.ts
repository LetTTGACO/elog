import { afterEach, describe, expect, it, vi } from 'vitest';
import inquirer from 'inquirer';
import { runExportWizard, runInitWizard } from './wizard';
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
  it.each(['init', 'export'] as const)(
    'runs %s with registered inquirer prompt types',
    async (command) => {
      const prompt = inquirer.createPromptModule();
      // 保留真实问题解析与类型校验，只替换终端交互，防止 mock 掩盖不支持的类型。
      for (const type of Object.keys(prompt.prompts)) {
        prompt.registerPrompt(type, async (question) => {
          const choices = question.choices as Array<{ value: string }> | undefined;
          const value = choices?.[0]?.value;
          return type === 'checkbox' ? (value ? [value] : []) : value;
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
