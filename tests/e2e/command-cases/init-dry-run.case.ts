import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode, expectOutputContains } from '../src/helpers/assertions';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'init-dry-run',
  command: ['init', '--dry-run', '--name', 'elog.config.ts'],
  expect({ result, workspace }) {
    expectExitCode(result, 0);
    expectOutputContains(result, 'Install command:');
    expectOutputContains(result, 'elog.config.ts:');
    expectOutputContains(result, "import { defineConfig } from '@elog/cli';");
    expect(result.combinedOutput).not.toContain('@elog/core');
    expectOutputContains(result, 'from:');
    expectOutputContains(result, 'to:');
    expectOutputContains(result, '.env（新增变量）:');
    expectOutputContains(
      result,
      '# 获取与配置教程：https://elog.1874.cool/notion/gvnxobqogetukays',
    );
    expectOutputContains(result, '# Notion Token');
    expectOutputContains(result, 'NOTION_TOKEN=');
    expect(result.combinedOutput).not.toContain('.env.example');
    expect(result.combinedOutput).not.toContain('redacted');
    expect(fs.existsSync(path.join(workspace, 'elog.config.ts'))).toBe(false);
    expect(fs.existsSync(path.join(workspace, '.env'))).toBe(false);
    expect(fs.existsSync(path.join(workspace, '.gitignore'))).toBe(false);
    expect(fs.existsSync(path.join(workspace, '.env.example'))).toBe(false);
  },
};

export default commandCase;
