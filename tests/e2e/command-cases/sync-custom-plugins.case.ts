import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode } from '../src/helpers/assertions';
import { runElog } from '../src/helpers/run-cli';
import { copyIntoWorkspace } from '../src/helpers/temp-workspace';
import type { CommandCase } from '../src/helpers/types';

const commandCase: CommandCase = {
  id: 'sync-custom-plugins',
  command: ['sync', '--config', 'elog.config.ts'],
  setup({ workspace, repoRoot }) {
    copyIntoWorkspace(path.join(repoRoot, 'examples/plugin-development'), workspace, [
      'src',
      'documents.json',
      'elog.config.ts',
    ]);
  },
  async expect({ result, workspace, repoRoot }) {
    expectExitCode(result, 0);
    const output = path.join(workspace, 'output/hello.md');
    expect(fs.readFileSync(output, 'utf8')).toContain('由 Elog 自定义插件同步。');
    const cachePath = path.join(workspace, 'elog.cache.json');
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    expect(cache.cachedDocList).toHaveLength(2);
    expect(cache.cachedDocList[0]).not.toHaveProperty('body');

    const second = await runElog(['sync'], { cwd: workspace, repoRoot });
    expectExitCode(second, 0);
    expect(second.combinedOutput).toContain('没有需要同步的文档');

    const sourcePath = path.join(workspace, 'documents.json');
    const docs = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    docs[0].body = '# Updated through CLI';
    docs[0].updateTime += 1;
    fs.writeFileSync(sourcePath, JSON.stringify(docs), 'utf8');
    const updated = await runElog(['sync'], { cwd: workspace, repoRoot });
    expectExitCode(updated, 0);
    expect(fs.readFileSync(output, 'utf8')).toBe(
      '# Updated through CLI\n\n由 Elog 自定义插件同步。',
    );
    const updatedCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    expect(updatedCache.cachedDocList).toHaveLength(2);
    expect(updatedCache.cachedDocList[0].updateTime).toBe(docs[0].updateTime);
  },
};

export default commandCase;
