import { describe, expect, it, vi } from 'vitest';
import { createPluginContext } from '../plugins/context';
import { ElogPluginError } from '../plugins/errors';
import type { FromPlugin, PluginContext, ToPlugin, TransformPlugin } from '../plugins/types';
import { PluginDriver } from './PluginDriver';

const ctx: PluginContext = {
  workflow: { id: 'workflow-1', cacheFilePath: 'elog.cache.json' },
  logger: {
    debug: () => undefined,
    success: () => undefined,
    error: (message: string) => {
      throw new Error(message);
    },
    info: () => undefined,
    warn: () => undefined,
  },
  http: {} as PluginContext['http'],
  cache: { docList: [] },
  image: {} as PluginContext['image'],
};

const from: FromPlugin = {
  name: 'from:mock',
  kind: 'from',
  async download() {
    return {
      docDetailList: [
        {
          id: 'a',
          title: 'A',
          updateTime: 1,
          body: 'A',
          properties: { title: 'A', urlname: 'a' },
        },
      ],
      sortedDocList: [{ id: 'a', updateTime: 1 }],
      docStatusMap: { a: { _updateIndex: -1, _status: 1 } },
    };
  },
};

describe('PluginDriver', () => {
  it('runs transform plugins as a serial reducer', async () => {
    const first: TransformPlugin = {
      name: 'transform:first',
      kind: 'transform',
      async transform(docs) {
        return docs.map((doc) => ({ ...doc, body: `${doc.body}-first` }));
      },
    };
    const second: TransformPlugin = {
      name: 'transform:second',
      kind: 'transform',
      async transform(docs) {
        return docs.map((doc) => ({ ...doc, body: `${doc.body}-second` }));
      },
    };
    const driver = new PluginDriver({ from, transforms: [first, second], to: [] }, ctx);
    const downloaded = await driver.runDownloadHook();
    const transformed = await driver.runTransformPipeline(downloaded.docDetailList);

    expect(transformed[0].body).toBe('A-first-second');
  });

  it('wraps plugin hook failures', async () => {
    const bad: TransformPlugin = {
      name: 'transform:bad',
      kind: 'transform',
      async transform() {
        throw new Error('bad transform');
      },
    };
    const driver = new PluginDriver({ from, transforms: [bad], to: [] }, ctx);

    await expect(driver.runTransformPipeline([])).rejects.toMatchObject({
      name: 'ElogPluginError',
      pluginName: 'transform:bad',
      hookName: 'transform',
    } as Partial<ElogPluginError>);
  });

  it('wraps plugin logger errors without exiting the process', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fatalFrom: FromPlugin = {
      name: 'from:fatal',
      kind: 'from',
      async download(ctx) {
        return ctx.logger.error('missing token');
      },
    };
    const driver = new PluginDriver(
      { from: fatalFrom, transforms: [], to: [] },
      createPluginContext({
        workflow: { id: 'workflow-1', cacheFilePath: 'elog.cache.json' },
        cachedDocList: [],
      }),
    );

    await expect(driver.runDownloadHook()).rejects.toMatchObject({
      name: 'ElogPluginError',
      pluginName: 'from:fatal',
      hookName: 'download',
    } as Partial<ElogPluginError>);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('runs deploy hooks serially by default', async () => {
    const calls: string[] = [];
    const first: ToPlugin = {
      name: 'to:first',
      kind: 'to',
      deploy() {
        calls.push('first');
      },
    };
    const second: ToPlugin = {
      name: 'to:second',
      kind: 'to',
      deploy() {
        calls.push('second');
      },
    };
    const driver = new PluginDriver({ from, transforms: [], to: [first, second] }, ctx);

    await driver.runDeployHooks([], 'serial');

    expect(calls).toEqual(['first', 'second']);
  });
});
