import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { countFilesByExtension, readJsonFile, requireDirectory, requireFile } from './assertions';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('assertion helpers', () => {
  it('checks files, directories, JSON, and extension counts', () => {
    const tmpRoot = path.join(process.cwd(), '.tmp');
    fs.mkdirSync(tmpRoot, { recursive: true });
    const root = fs.mkdtempSync(path.join(tmpRoot, 'elog-e2e-assertions-'));
    tempRoots.push(root);

    fs.mkdirSync(path.join(root, 'docs'));
    fs.writeFileSync(path.join(root, 'docs/a.md'), '# A', 'utf8');
    fs.writeFileSync(path.join(root, 'docs/b.txt'), 'B', 'utf8');
    fs.writeFileSync(path.join(root, 'cache.json'), '{"sortedDocList":[]}', 'utf8');

    expect(requireDirectory(path.join(root, 'docs'))).toBe(path.join(root, 'docs'));
    expect(requireFile(path.join(root, 'cache.json'))).toBe(path.join(root, 'cache.json'));
    expect(readJsonFile(path.join(root, 'cache.json'))).toEqual({ sortedDocList: [] });
    expect(countFilesByExtension(path.join(root, 'docs'), '.md')).toBe(1);
  });
});
