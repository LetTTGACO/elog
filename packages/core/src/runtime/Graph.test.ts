import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocSyncStatus } from '../const';
import type { ElogPluginError } from '../plugins/errors';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';
import type { DocDetail } from '../types/doc';
import { Graph } from './Graph';
import type { RuntimeWorkflowConfig } from './types';

let tempDir = '';

function makeDoc(id: string): DocDetail {
  return {
    id,
    title: id,
    updateTime: 1,
    body: `body-${id}`,
    properties: { title: id, urlname: id },
  };
}

function makeWorkflow(overrides: Partial<RuntimeWorkflowConfig> = {}): RuntimeWorkflowConfig {
  const from: FromPlugin = {
    name: 'from:mock',
    kind: 'from',
    async download() {
      return {
        docDetailList: [makeDoc('a')],
        sortedDocList: [{ id: 'a', updateTime: 1 }],
        docStatusMap: { a: { _updateIndex: -1, _status: DocSyncStatus.NEW } },
      };
    },
  };
  const to: ToPlugin = {
    name: 'to:mock',
    kind: 'to',
    deploy() {},
  };

  return {
    id: 'workflow-1',
    disabled: false,
    cache: {
      disabled: false,
      writeDisabled: false,
      filePath: path.join(tempDir, 'elog.cache.json'),
    },
    from,
    transforms: [],
    to: [to],
    deployStrategy: 'serial',
    ...overrides,
  };
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = '';
  }
});

describe('Graph', () => {
  it('returns success result and writes cache for a successful workflow', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
    const deployCalls: DocDetail[][] = [];
    const transform: TransformPlugin = {
      name: 'transform:append',
      kind: 'transform',
      async transform(docs) {
        return docs.map((doc) => ({ ...doc, body: `${doc.body}-transformed` }));
      },
    };
    const to: ToPlugin = {
      name: 'to:mock',
      kind: 'to',
      deploy(docs) {
        deployCalls.push(docs);
      },
    };
    const workflow = makeWorkflow({ transforms: [transform], to: [to] });

    const result = await new Graph(workflow).sync();

    expect(result).toEqual({
      status: 'success',
      workflowId: 'workflow-1',
      syncedCount: 1,
      cacheFilePath: workflow.cache.filePath,
      sortedDocList: [{ id: 'a', updateTime: 1 }],
    });
    expect(deployCalls).toHaveLength(1);
    expect(deployCalls[0][0].body).toBe('body-a-transformed');

    const cache = JSON.parse(fs.readFileSync(workflow.cache.filePath, 'utf8'));
    expect(cache.cachedDocList[0]).toMatchObject({
      id: 'a',
      title: 'a',
      updateTime: 1,
    });
    expect(cache.cachedDocList[0]).not.toHaveProperty('body');
    expect(cache.sortedDocList).toEqual([{ id: 'a', updateTime: 1 }]);
  });

  it.each([
    ['serial', 'transform'],
    ['parallel', 'transform'],
    ['serial', 'deploy'],
    ['parallel', 'deploy'],
  ] as const)(
    'isolates nested target mutations from other targets and cache (%s, %s)',
    async (deployStrategy, stage) => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
      const doc = {
        ...makeDoc('a'),
        properties: { title: 'a', urlname: 'a', tags: ['original'] },
        docStructure: [{ id: 'parent', title: 'Original' }],
        extra: { nested: ['original'] },
      };
      const mutate: TransformPlugin = {
        name: 'transform:mutate',
        kind: 'transform',
        async transform(docs) {
          Reflect.deleteProperty(docs[0].properties, 'urlname');
          docs[0].properties.tags.push('changed');
          docs[0].docStructure![0].title = 'Changed';
          docs[0].extra.nested.push('changed');
          return docs;
        },
      };
      const workflow = makeWorkflow({
        deployStrategy,
        from: {
          name: 'from:mock',
          kind: 'from',
          async download() {
            return {
              docDetailList: [doc],
              sortedDocList: [{ id: 'a', updateTime: 1 }],
              docStatusMap: { a: { _updateIndex: -1, _status: DocSyncStatus.NEW } },
            };
          },
        },
        to: [
          {
            name: 'to:mutate',
            kind: 'to',
            plugins: stage === 'transform' ? [mutate] : [],
            async deploy(docs, ctx) {
              if (stage === 'deploy') await mutate.transform(docs, ctx);
              expect(docs[0].extra.nested).toEqual(['original', 'changed']);
            },
          },
          {
            name: 'to:observe',
            kind: 'to',
            deploy(docs) {
              expect(docs[0]).toEqual(doc);
              expect(docs[0].properties.tags).toEqual(['original']);
              expect(docs[0].docStructure![0].title).toBe('Original');
              expect(docs[0].extra.nested).toEqual(['original']);
              expect(docs[0].properties.urlname).toBe('a');
            },
          },
        ],
      });

      expect((await new Graph(workflow).sync()).status).toBe('success');
      const cache = JSON.parse(fs.readFileSync(workflow.cache.filePath, 'utf8'));
      expect(cache.cachedDocList[0].properties).toEqual({
        title: 'a',
        urlname: 'a',
        tags: ['original'],
      });
      expect(cache.cachedDocList[0].docStructure).toEqual([{ id: 'parent', title: 'Original' }]);
      expect(cache.cachedDocList[0].extra).toEqual({ nested: ['original'] });
    },
  );

  it.each(['add', 'remove', 'rename', 'duplicate'])(
    'rejects transform identity changes before deploy or cache write (%s)',
    async (change) => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
      let deployed = false;
      const workflow = makeWorkflow({
        transforms: [
          {
            name: 'transform:identity',
            kind: 'transform',
            async transform(docs) {
              if (change === 'add') docs.push(makeDoc('b'));
              if (change === 'remove') docs.pop();
              if (change === 'rename') docs[0].id = 'renamed';
              if (change === 'duplicate') docs.push(docs[0]);
              return docs;
            },
          },
        ],
        to: [
          {
            name: 'to:mock',
            kind: 'to',
            deploy() {
              deployed = true;
            },
          },
        ],
      });
      fs.writeFileSync(workflow.cache.filePath, JSON.stringify({ cachedDocList: [] }));
      const originalCache = fs.readFileSync(workflow.cache.filePath, 'utf8');

      expect(await new Graph(workflow).sync()).toMatchObject({
        status: 'failed',
        error: {
          pluginName: 'transform:identity',
          hookName: 'transform',
          cause: { message: 'Transform must preserve document IDs and count, with unique IDs' },
        },
      });
      expect(deployed).toBe(false);
      expect(fs.readFileSync(workflow.cache.filePath, 'utf8')).toBe(originalCache);
    },
  );

  it('returns success result without writing cache when cache writes are disabled', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
    const workflow = makeWorkflow({
      cache: {
        disabled: true,
        writeDisabled: true,
        filePath: path.join(tempDir, 'elog.cache.json'),
      },
    });

    const result = await new Graph(workflow).sync();

    expect(result).toMatchObject({
      status: 'success',
      workflowId: 'workflow-1',
      syncedCount: 1,
      cacheFilePath: workflow.cache.filePath,
    });
    expect(fs.existsSync(workflow.cache.filePath)).toBe(false);
  });

  it.each(['throw', 'identity'])(
    'reports target transform failures and preserves cache (%s)',
    async (failure) => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
      const calls: string[] = [];
      const workflow = makeWorkflow({
        to: [
          {
            name: 'to:html',
            kind: 'to',
            plugins: [
              {
                name: 'transform:bad',
                kind: 'transform',
                async transform(docs) {
                  if (failure === 'throw') throw new Error('bad target transform');
                  docs[0].id = 'renamed';
                  return docs;
                },
              },
            ],
            deploy() {
              calls.push('html');
            },
          },
          {
            name: 'to:later',
            kind: 'to',
            deploy() {
              calls.push('later');
            },
          },
        ],
      });
      const originalCache = JSON.stringify({ cachedDocList: [] });
      fs.writeFileSync(workflow.cache.filePath, originalCache);

      const result = await new Graph(workflow).sync();

      expect(result).toMatchObject({
        status: 'failed',
        error: {
          pluginName: 'transform:bad',
          hookName: 'transform',
          targetPluginName: 'to:html',
          message: 'Plugin "transform:bad" failed during "transform" hook for target "to:html"',
          cause: {
            message:
              failure === 'throw'
                ? 'bad target transform'
                : 'Transform must preserve document IDs and count, with unique IDs',
          },
        },
      });
      expect(calls).toEqual([]);
      expect(fs.readFileSync(workflow.cache.filePath, 'utf8')).toBe(originalCache);
    },
  );

  it('returns failed result and prevents deploy when transform fails', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
    const deployCalls: DocDetail[][] = [];
    const badTransform: TransformPlugin = {
      name: 'transform:bad',
      kind: 'transform',
      async transform() {
        throw new Error('bad transform');
      },
    };
    const to: ToPlugin = {
      name: 'to:mock',
      kind: 'to',
      deploy(docs) {
        deployCalls.push(docs);
      },
    };
    const workflow = makeWorkflow({ transforms: [badTransform], to: [to] });

    const result = await new Graph(workflow).sync();

    expect(result.status).toBe('failed');
    expect(result.workflowId).toBe('workflow-1');
    expect(result).toMatchObject({
      error: {
        name: 'ElogPluginError',
        pluginName: 'transform:bad',
        hookName: 'transform',
      } as Partial<ElogPluginError>,
    });
    expect(deployCalls).toEqual([]);
    expect(fs.existsSync(workflow.cache.filePath)).toBe(false);
  });

  it('returns failed result and does not write cache when deploy fails', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
    const to: ToPlugin = {
      name: 'to:bad',
      kind: 'to',
      deploy() {
        throw new Error('bad deploy');
      },
    };
    const workflow = makeWorkflow({ to: [to] });

    const result = await new Graph(workflow).sync();

    expect(result.status).toBe('failed');
    expect(result.workflowId).toBe('workflow-1');
    expect(result).toMatchObject({
      error: {
        name: 'ElogPluginError',
        pluginName: 'to:bad',
        hookName: 'deploy',
      } as Partial<ElogPluginError>,
    });
    expect(fs.existsSync(workflow.cache.filePath)).toBe(false);
  });

  it('returns skipped result without transform or deploy when there are no changes', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
    const calls: string[] = [];
    const from: FromPlugin = {
      name: 'from:empty',
      kind: 'from',
      async download() {
        return {
          docDetailList: [],
          sortedDocList: [],
          docStatusMap: {},
        };
      },
    };
    const transform: TransformPlugin = {
      name: 'transform:unused',
      kind: 'transform',
      async transform(docs) {
        calls.push('transform');
        return docs;
      },
    };
    const to: ToPlugin = {
      name: 'to:unused',
      kind: 'to',
      plugins: [transform],
      deploy() {
        calls.push('deploy');
      },
    };
    const workflow = makeWorkflow({ from, transforms: [transform], to: [to] });

    const result = await new Graph(workflow).sync();

    expect(result).toEqual({
      status: 'skipped',
      workflowId: 'workflow-1',
      reason: 'no-changes',
    });
    expect(calls).toEqual([]);
    const cache = JSON.parse(fs.readFileSync(workflow.cache.filePath, 'utf8'));
    expect(cache).toEqual({
      cachedDocList: [],
      sortedDocList: [],
    });
  });

  it('prunes cache for deleted source docs even when no docs need deployment', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-graph-'));
    const cacheFile = path.join(tempDir, 'elog.cache.json');
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        cachedDocList: [makeDoc('kept'), makeDoc('removed')],
        sortedDocList: [
          { id: 'kept', updateTime: 1 },
          { id: 'removed', updateTime: 1 },
        ],
      }),
      { encoding: 'utf8' },
    );
    const from: FromPlugin = {
      name: 'from:deleted',
      kind: 'from',
      async download() {
        return {
          docDetailList: [],
          sortedDocList: [{ id: 'kept', updateTime: 1 }],
          docStatusMap: {},
        };
      },
    };
    const workflow = makeWorkflow({
      from,
      cache: {
        disabled: false,
        writeDisabled: false,
        filePath: cacheFile,
      },
    });

    const result = await new Graph(workflow).sync();

    expect(result).toEqual({
      status: 'skipped',
      workflowId: 'workflow-1',
      reason: 'no-changes',
    });
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    expect(cache.cachedDocList.map((doc: DocDetail) => doc.id)).toEqual(['kept']);
    expect(cache.sortedDocList).toEqual([{ id: 'kept', updateTime: 1 }]);
  });
});
