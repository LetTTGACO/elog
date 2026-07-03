import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  countFilesByExtension,
  expectSyncArtifacts,
  readJsonFile,
  requireDirectory,
  requireFile,
} from './assertions';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('assertion helpers', () => {
  it('checks files, directories, JSON, and extension counts', () => {
    const root = createTempRoot('elog-e2e-assertions-');

    fs.mkdirSync(path.join(root, 'docs'));
    fs.writeFileSync(path.join(root, 'docs/a.md'), '# A', 'utf8');
    fs.writeFileSync(path.join(root, 'docs/b.txt'), 'B', 'utf8');
    fs.writeFileSync(path.join(root, 'cache.json'), '{"sortedDocList":[]}', 'utf8');

    expect(requireDirectory(path.join(root, 'docs'))).toBe(path.join(root, 'docs'));
    expect(requireFile(path.join(root, 'cache.json'))).toBe(path.join(root, 'cache.json'));
    expect(readJsonFile(path.join(root, 'cache.json'))).toEqual({ sortedDocList: [] });
    expect(countFilesByExtension(path.join(root, 'docs'), '.md')).toBe(1);
  });

  it('allows cache-only artifact expectations', () => {
    const root = createTempRoot('elog-e2e-cache-only-');
    fs.writeFileSync(path.join(root, 'elog.cache.json'), '{"sortedDocList":[]}', 'utf8');

    expectSyncArtifacts(root, {
      cacheFile: 'elog.cache.json',
    });
  });

  it('checks optional markdown and image artifacts when configured', () => {
    const root = createTempRoot('elog-e2e-artifacts-');
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'images'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/a.md'), '# A', 'utf8');
    fs.writeFileSync(path.join(root, 'images/a.png'), 'image', 'utf8');
    fs.writeFileSync(path.join(root, 'elog.cache.json'), '{"sortedDocList":[]}', 'utf8');

    expectSyncArtifacts(root, {
      cacheFile: 'elog.cache.json',
      outputDir: 'docs',
      minMarkdownFiles: 1,
      imageDir: 'images',
      minImageFiles: 1,
    });
  });
});

function createTempRoot(name: string): string {
  const tmpRoot = path.join(process.cwd(), '.tmp');
  fs.mkdirSync(tmpRoot, { recursive: true });
  const root = fs.mkdtempSync(path.join(tmpRoot, name));
  tempRoots.push(root);
  return root;
}
