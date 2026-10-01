import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode } from '../src/helpers/assertions';
import { copyIntoWorkspace } from '../src/helpers/temp-workspace';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'sync-target-transforms',
  command: ['sync', '--config', 'elog.config.ts'],
  setup({ workspace, repoRoot }) {
    copyIntoWorkspace(path.join(repoRoot, 'tests/fixtures/basic-config'), workspace, [
      'plugins.ts',
    ]);
    fs.writeFileSync(
      path.join(workspace, 'elog.config.ts'),
      `import { defineConfig } from '@elog/cli';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toLocal from '@elog/plugin-to-local';
import { fromFixture, transformFixture } from './plugins';

export default defineConfig({
  from: fromFixture,
  plugins: [transformFixture],
  to: [
    toLocal({
      outputDir: 'html',
      fileExt: 'html',
      plugins: [markdownToHtml()],
    }),
    toLocal({ outputDir: 'markdown' }),
  ],
});
`,
    );
  },
  expect({ result, workspace }) {
    expectExitCode(result, 0);
    expect(fs.readFileSync(path.join(workspace, 'html/Fixture Doc.html'), 'utf8')).toBe(
      '<p>fixture-transformed</p>\n',
    );
    expect(fs.readFileSync(path.join(workspace, 'markdown/Fixture Doc.md'), 'utf8')).toBe(
      'fixture-transformed',
    );
    const cache = JSON.parse(fs.readFileSync(path.join(workspace, 'elog.cache.json'), 'utf8'));
    expect(cache.cachedDocList[0]).not.toHaveProperty('bodyType', 'html');
    expect(cache.cachedDocList[0]).not.toHaveProperty('rawBodyType');
  },
};

export default commandCase;
