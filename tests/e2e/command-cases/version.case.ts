import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode } from '../src/helpers/assertions';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'version',
  command: ['--version'],
  expect({ result, repoRoot }) {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'packages/cli/package.json'), 'utf8'),
    ) as { version: string };

    expectExitCode(result, 0);
    expect(result.stdout.trim()).toBe(packageJson.version);
  },
};

export default commandCase;
