import fs from 'node:fs';
import path from 'node:path';
import { expectExitCode, expectOutputContains, requireFile } from '../src/helpers/assertions';
import { copyIntoWorkspace } from '../src/helpers/temp-workspace';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'sync-offline-fixture',
  command: ['sync', '--config', 'elog.config.ts'],
  setup({ workspace, repoRoot }) {
    copyIntoWorkspace(path.join(repoRoot, 'tests/fixtures/basic-config'), workspace, [
      'elog.config.ts',
      'plugins.ts',
    ]);
  },
  expect({ result, workspace }) {
    expectExitCode(result, 0);
    expectOutputContains(result, '同步结果');
    requireFile(path.join(workspace, 'fixture.cache.json'));
    requireFile(path.join(workspace, 'fixture.output.txt'));

    const output = fs.readFileSync(path.join(workspace, 'fixture.output.txt'), 'utf8');
    expectOutputContains(
      {
        exitCode: 0,
        signal: null,
        stdout: output,
        stderr: '',
        combinedOutput: output,
      },
      'fixture-transformed',
    );
  },
};

export default commandCase;
