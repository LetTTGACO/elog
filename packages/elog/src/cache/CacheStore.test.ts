import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocSyncStatus } from '../const';
import { CacheStore } from './CacheStore';
import type { DocDetail } from '../types/doc';

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

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('CacheStore', () => {
  it('loads empty cache when disabled', () => {
    const store = new CacheStore({
      disabled: true,
      writeDisabled: false,
      filePath: 'missing.json',
    });

    expect(store.cachedDocList).toEqual([]);
  });

  it('updates and writes cache without body content while keeping body metadata', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-cache-'));
    const cacheFile = path.join(tempDir, 'elog.cache.json');
    const store = new CacheStore({ disabled: false, writeDisabled: false, filePath: cacheFile });

    store.update(
      [
        {
          ...makeDoc('a'),
          bodyType: 'html',
          rawBody: '# a',
          rawBodyType: 'markdown',
        },
      ],
      {
        a: { _updateIndex: -1, _status: DocSyncStatus.NEW },
      },
    );
    store.write([{ id: 'a', updateTime: 1 }]);

    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    expect(cache.cachedDocList[0]).toMatchObject({
      id: 'a',
      bodyType: 'html',
      rawBodyType: 'markdown',
    });
    expect(cache.cachedDocList[0]).not.toHaveProperty('body');
    expect(cache.cachedDocList[0]).not.toHaveProperty('rawBody');
    expect(cache.sortedDocList).toEqual([{ id: 'a', updateTime: 1 }]);
  });

  it('marks image transform failures for retry', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-cache-'));
    const cacheFile = path.join(tempDir, 'elog.cache.json');
    const store = new CacheStore({ disabled: false, writeDisabled: false, filePath: cacheFile });

    store.update([{ ...makeDoc('a'), error: 1 }], {
      a: { _updateIndex: -1, _status: DocSyncStatus.NEW },
    });
    store.write([{ id: 'a', updateTime: 1 }]);

    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    expect(cache.cachedDocList[0]._status).toBe(DocSyncStatus.IMAGE_ERROR);
  });

  it('loads enabled cache and updates existing cached docs', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-cache-'));
    const cacheFile = path.join(tempDir, 'elog.cache.json');
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        cachedDocList: [makeDoc('existing')],
        sortedDocList: [{ id: 'existing', updateTime: 1 }],
      }),
      { encoding: 'utf8' },
    );
    const store = new CacheStore({ disabled: false, writeDisabled: false, filePath: cacheFile });

    expect(store.cachedDocList).toHaveLength(1);
    expect(store.cachedDocList[0].id).toBe('existing');

    store.update([{ ...makeDoc('existing'), updateTime: 2, body: 'updated-body' }], {
      existing: { _updateIndex: 0, _status: DocSyncStatus.UPDATE },
    });
    store.write([{ id: 'existing', updateTime: 2 }]);

    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    expect(cache.cachedDocList).toHaveLength(1);
    expect(cache.cachedDocList[0]).toMatchObject({
      id: 'existing',
      updateTime: 2,
    });
    expect(cache.cachedDocList[0]).not.toHaveProperty('body');
    expect(cache.sortedDocList).toEqual([{ id: 'existing', updateTime: 2 }]);
  });

  it('drops cached docs missing from the latest sorted doc list', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-cache-'));
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
    const store = new CacheStore({ disabled: false, writeDisabled: false, filePath: cacheFile });

    store.write([{ id: 'kept', updateTime: 1 }]);

    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    expect(cache.cachedDocList.map((doc: DocDetail) => doc.id)).toEqual(['kept']);
    expect(cache.sortedDocList).toEqual([{ id: 'kept', updateTime: 1 }]);
  });
});
