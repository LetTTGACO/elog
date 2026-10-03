import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sync } from '@elog/core';
import type { DocDetail, PluginContext, TransformPlugin } from '@elog/plugin-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fromJson from './from-json';
import appendFooter from './append-footer';
import toFiles from './to-files';

function createDoc(id: string, publish = true): DocDetail {
  return {
    id,
    title: id,
    updateTime: 1,
    body: `# ${id}`,
    bodyType: 'markdown',
    properties: { title: id, urlname: id, publish },
  };
}

// 这个 Context 只用于正文转换单测；使用 HTTP/图片能力的插件需提供对应实现。
function createTestContext(): PluginContext {
  return {
    workflow: { id: 'test', cacheFilePath: 'unused.json' },
    cache: { docList: [] },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error(message): never {
        throw new Error(message);
      },
    },
    http: async () => {
      throw new Error('测试需要显式提供 HTTP 实现');
    },
    image: {} as PluginContext['image'],
  };
}

describe('custom plugins through public APIs', () => {
  let workspace: string;
  let sourceFile: string;
  let outputDir: string;
  let cacheFilePath: string;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(os.tmpdir(), 'elog-plugin-example-'));
    sourceFile = path.join(workspace, 'documents.json');
    outputDir = path.join(workspace, 'output');
    cacheFilePath = path.join(workspace, 'cache.json');
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  async function writeSource(docs: DocDetail[]) {
    await writeFile(sourceFile, JSON.stringify(docs), 'utf8');
  }

  it('appends a footer while preserving document identity and properties', async () => {
    const original = createDoc('hello');
    const result = await appendFooter('Footer').transform([original], createTestContext());

    expect(result).toEqual([{ ...original, body: '# hello\n\nFooter' }]);
    expect(original.body).toBe('# hello');
  });

  it('syncs once, skips unchanged docs, and deploys only a changed doc', async () => {
    const docs = [createDoc('hello'), createDoc('other')];
    await writeSource(docs);
    const target = toFiles({ outputDir });
    const deploy = vi.spyOn(target, 'deploy');
    const config = {
      id: 'example',
      cacheFilePath,
      from: fromJson({ file: sourceFile }),
      plugins: [appendFooter('Footer')],
      to: target,
    };

    expect(await sync(config)).toMatchObject([{ status: 'success', syncedCount: 2 }]);
    expect(await readFile(path.join(outputDir, 'hello.md'), 'utf8')).toBe('# hello\n\nFooter');
    const cache = JSON.parse(await readFile(cacheFilePath, 'utf8'));
    expect(cache.cachedDocList.map((doc: { id: string }) => doc.id)).toEqual(['hello', 'other']);
    expect(cache.cachedDocList[0]).not.toHaveProperty('body');
    expect(cache.sortedDocList[0]).not.toHaveProperty('body');

    expect(await sync(config)).toMatchObject([{ status: 'skipped', reason: 'no-changes' }]);
    expect(deploy).toHaveBeenCalledTimes(1);

    docs[0] = { ...docs[0], updateTime: 2, body: '# Updated' };
    await writeSource(docs);
    expect(await sync(config)).toMatchObject([{ status: 'success', syncedCount: 1 }]);
    expect(deploy.mock.calls[1][0].map((doc) => doc.id)).toEqual(['hello']);
    expect(await readFile(path.join(outputDir, 'hello.md'), 'utf8')).toBe('# Updated\n\nFooter');
    expect(await readFile(path.join(outputDir, 'other.md'), 'utf8')).toBe('# other\n\nFooter');
  });

  it('filters at the source and prunes cache when a document leaves the scope', async () => {
    const docs = [createDoc('public'), createDoc('draft', false)];
    await writeSource(docs);
    const config = {
      cacheFilePath,
      from: fromJson({ file: sourceFile, include: (doc) => doc.properties.publish === true }),
      to: toFiles({ outputDir }),
    };
    expect(await sync(config)).toMatchObject([{ status: 'success', syncedCount: 1 }]);
    expect(existsSync(path.join(outputDir, 'draft.md'))).toBe(false);

    await writeSource([docs[1]]);
    expect(await sync(config)).toMatchObject([{ status: 'skipped', reason: 'no-changes' }]);
    const cache = JSON.parse(await readFile(cacheFilePath, 'utf8'));
    expect(cache.cachedDocList).toEqual([]);
    expect(cache.sortedDocList).toEqual([]);
    // 缓存清理与目标删除是不同的行为，本示例目标只创建或更新文件。
    expect(existsSync(path.join(outputDir, 'public.md'))).toBe(true);
  });

  it('isolates target-specific transforms from other targets', async () => {
    await writeSource([createDoc('hello')]);
    const otherDir = path.join(workspace, 'other');
    const result = await sync({
      cacheFilePath,
      from: fromJson({ file: sourceFile }),
      plugins: [appendFooter('Shared')],
      deployStrategy: 'parallel',
      to: [
        toFiles({ outputDir, plugins: [appendFooter('Target A')] }),
        toFiles({ outputDir: otherDir }),
      ],
    });

    expect(result).toMatchObject([{ status: 'success' }]);
    expect(await readFile(path.join(outputDir, 'hello.md'), 'utf8')).toBe(
      '# hello\n\nShared\n\nTarget A',
    );
    expect(await readFile(path.join(otherDir, 'hello.md'), 'utf8')).toBe('# hello\n\nShared');
  });

  it('reports an invalid transform without deploying or advancing cache', async () => {
    await writeSource([createDoc('hello')]);
    const badFilter: TransformPlugin = {
      name: 'transform:bad-filter',
      kind: 'transform',
      async transform() {
        return [];
      },
    };
    const result = await sync({
      cacheFilePath,
      from: fromJson({ file: sourceFile }),
      plugins: [badFilter],
      to: toFiles({ outputDir }),
    });

    expect(result).toMatchObject([
      { status: 'failed', error: { pluginName: 'transform:bad-filter', hookName: 'transform' } },
    ]);
    expect(existsSync(outputDir)).toBe(false);
    expect(existsSync(cacheFilePath)).toBe(false);
  });

  it('reports a source failure with plugin and hook information', async () => {
    await writeFile(sourceFile, '{}', 'utf8');
    const result = await sync({
      cacheFilePath,
      from: fromJson({ file: sourceFile }),
      to: toFiles({ outputDir }),
    });

    expect(result).toMatchObject([
      { status: 'failed', error: { pluginName: 'from:json', hookName: 'download' } },
    ]);
    expect(existsSync(outputDir)).toBe(false);
    expect(existsSync(cacheFilePath)).toBe(false);
  });

  it('replays completed targets after a deploy failure without creating duplicate files', async () => {
    await writeSource([createDoc('hello')]);
    const files = toFiles({ outputDir });
    const deployFiles = vi.spyOn(files, 'deploy');
    const deployRemote = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue(undefined);
    const config = {
      cacheFilePath,
      from: fromJson({ file: sourceFile }),
      to: [files, { name: 'to:remote', kind: 'to' as const, deploy: deployRemote }],
    };

    expect(await sync(config)).toMatchObject([
      { status: 'failed', error: { pluginName: 'to:remote', hookName: 'deploy' } },
    ]);
    expect(existsSync(cacheFilePath)).toBe(false);
    expect(await readFile(path.join(outputDir, 'hello.md'), 'utf8')).toBe('# hello');

    expect(await sync(config)).toMatchObject([{ status: 'success', syncedCount: 1 }]);
    expect(deployFiles).toHaveBeenCalledTimes(2);
    expect(await readdir(outputDir)).toEqual(['hello.md']);
    expect(existsSync(cacheFilePath)).toBe(true);
  });
});
