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
    expectOutputContains(result, "import { defineConfig } from '@elogx-test/elog';");
    expectOutputContains(result, 'from:');
    expectOutputContains(result, 'to:');
    expect(result.combinedOutput).not.toContain('.env:');
    expect(result.combinedOutput).not.toContain('.env.example');
    expect(result.combinedOutput).not.toContain('redacted');
    expect(fs.existsSync(path.join(workspace, 'elog.config.ts'))).toBe(false);
    expect(fs.existsSync(path.join(workspace, '.env'))).toBe(false);
    expect(fs.existsSync(path.join(workspace, '.env.example'))).toBe(false);
  },
};

export default commandCase;
