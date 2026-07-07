import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocSyncStatus, type FromPlugin, type ToPlugin } from '@elog/plugin-sdk';
import { ElogConfigError, defineConfig, sync, syncFromConfig } from './index';

let tempDir = '';
let contextCapabilities:
  | {
      workflowId: string;
      httpType: string;
      cachedDocCount: number;
      imageGetFileType: string;
      loggerError: string;
    }
  | undefined;

const fromPlugin: FromPlugin = {
  name: 'from:public-entry',
  kind: 'from',
  async download(ctx) {
    contextCapabilities = {
      workflowId: ctx.workflow.id,
      httpType: typeof ctx.http,
      cachedDocCount: ctx.cache.docList.length,
      imageGetFileType: typeof ctx.image.getFileType,
      loggerError: typeof ctx.logger.error,
    };
    return {
      docDetailList: [
        {
          id: 'doc-1',
          title: 'Doc 1',
          updateTime: 1,
          body: `workflow:${ctx.workflow.id};http:${typeof ctx.http};image:${typeof ctx.image.getFileType}`,
          properties: { title: 'Doc 1', urlname: 'doc-1' },
        },
      ],
      sortedDocList: [{ id: 'doc-1', updateTime: 1 }],
      docStatusMap: {
        'doc-1': { _updateIndex: -1, _status: DocSyncStatus.NEW },
      },
    };
  },
};

const toPlugin: ToPlugin = {
  name: 'to:public-entry',
  kind: 'to',
  deploy() {},
};

afterEach(() => {
  contextCapabilities = undefined;
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = '';
  }
});

describe('Core public sync entrypoints', () => {
  it('runs direct sync and returns structured workflow results', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-core-public-'));
    const config = defineConfig({
      id: 'core-workflow',
      cacheFilePath: path.join(tempDir, 'elog.cache.json'),
      from: fromPlugin,
      to: toPlugin,
    });

    const results = await sync(config);

    expect(results).toEqual([
      {
        status: 'success',
        workflowId: 'core-workflow',
        syncedCount: 1,
        cacheFilePath: path.join(tempDir, 'elog.cache.json'),
        sortedDocList: [{ id: 'doc-1', updateTime: 1 }],
      },
    ]);
    expect(contextCapabilities).toEqual({
      workflowId: 'core-workflow',
      httpType: 'function',
      cachedDocCount: 0,
      imageGetFileType: 'function',
      loggerError: 'function',
    });
  });

  it('loads a config file and explicit env file without CLI behavior', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-core-config-'));
    const configPath = path.join(tempDir, 'elog.config.mjs');
    const envPath = path.join(tempDir, '.env.local');
    fs.writeFileSync(envPath, 'ELOG_CORE_TEST_VALUE=from-env\n', { encoding: 'utf8' });
    fs.writeFileSync(
      configPath,
      `export default {
        id: 'config-file-workflow',
        from: {
          name: 'from:config-file',
          kind: 'from',
          async download() {
            return {
              docDetailList: [{
                id: 'doc-1',
                title: process.env.ELOG_CORE_TEST_VALUE,
                updateTime: 1,
                body: 'body',
                properties: { title: 'Doc 1', urlname: 'doc-1' }
              }],
              sortedDocList: [{ id: 'doc-1', updateTime: 1 }],
              docStatusMap: { 'doc-1': { _updateIndex: -1, _status: ${DocSyncStatus.NEW} } }
            };
          }
        },
        to: { name: 'to:config-file', kind: 'to', deploy() {} }
      };`,
      { encoding: 'utf8' },
    );

    const results = await syncFromConfig({ cwd: tempDir, envFile: '.env.local' });

    expect(results[0]).toMatchObject({
      status: 'success',
      workflowId: 'config-file-workflow',
      syncedCount: 1,
    });
    expect(results[0]).toMatchObject({
      cacheFilePath: path.join(tempDir, 'elog.cache.json'),
    });
    expect(fs.existsSync(path.join(tempDir, 'elog.cache.json'))).toBe(true);
  });

  it('throws config errors before runtime instead of exiting the process', async () => {
    await expect(sync(undefined)).rejects.toThrow(ElogConfigError);
  });
});
