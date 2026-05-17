import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode, expectOutputContains } from '../src/helpers/assertions';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'init-dry-run',
  command: ['init', '--dry-run', '--name', 'elog.config.ts'],
  skip: 'init requires interactive wizard (inquirer) which cannot run in non-TTY spawned process',
  expect({ result, workspace }) {
    expectExitCode(result, 0);
    expectOutputContains(result, 'elog.config.ts');
    expect(fs.existsSync(path.join(workspace, 'elog.config.ts'))).toBe(false);
  },
};

export default commandCase;
