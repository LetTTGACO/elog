import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyIntoWorkspace, createTempWorkspace } from './temp-workspace';

const createdPaths: string[] = [];

afterEach(() => {
  for (const item of createdPaths.splice(0)) {
    fs.rmSync(item, { recursive: true, force: true });
  }
});

describe('temp workspace helpers', () => {
  it('creates an isolated workspace and removes it on cleanup', () => {
    const workspace = createTempWorkspace('elog-e2e-test-');
    createdPaths.push(workspace.path);

    expect(fs.existsSync(workspace.path)).toBe(true);

    workspace.cleanup(true);

    expect(fs.existsSync(workspace.path)).toBe(false);
  });

  it('copies files and directories into the workspace', () => {
    const workspace = createTempWorkspace('elog-e2e-test-');
    const sourceRoot = path.join(workspace.path, 'source');
    createdPaths.push(workspace.path);

    fs.mkdirSync(path.join(sourceRoot, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(sourceRoot, 'nested/file.txt'), 'hello', 'utf8');

    copyIntoWorkspace(sourceRoot, workspace.path, ['nested']);

    expect(fs.readFileSync(path.join(workspace.path, 'nested/file.txt'), 'utf8')).toBe('hello');
  });
});
