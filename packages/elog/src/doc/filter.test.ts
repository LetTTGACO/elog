import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocSyncStatus } from '../const';
import { filterDocs } from './filter';
import out from '../logging/logger';
import type { DocDetail } from '../types/doc';

const cachedDoc: DocDetail = {
  id: 'cached',
  title: 'Cached',
  updateTime: 1,
  body: 'body',
  properties: { title: 'Cached', urlname: 'cached' },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('filterDocs', () => {
  it('returns new docs', () => {
    const result = filterDocs([], [{ id: 'new', updateTime: 1, properties: { title: 'New' } }]);

    expect(result.docList).toHaveLength(1);
    expect(result.docStatusMap.new._status).toBe(DocSyncStatus.NEW);
  });

  it('returns updated docs', () => {
    const result = filterDocs(
      [cachedDoc],
      [{ id: 'cached', updateTime: 2, properties: { title: 'Cached' } }],
    );

    expect(result.docList).toHaveLength(1);
    expect(result.docStatusMap.cached._status).toBe(DocSyncStatus.UPDATE);
  });

  it('returns original cache index when stale cached docs are filtered out', () => {
    const deletedDoc: DocDetail = {
      id: 'deleted',
      title: 'Deleted',
      updateTime: 1,
      body: 'deleted-body',
      properties: { title: 'Deleted', urlname: 'deleted' },
    };

    const result = filterDocs(
      [deletedDoc, cachedDoc],
      [{ id: 'cached', updateTime: 2, properties: { title: 'Cached' } }],
    );

    expect(result.docStatusMap.cached).toEqual({
      _updateIndex: 1,
      _status: DocSyncStatus.UPDATE,
    });
  });

  it('retries previously failed docs', () => {
    const warn = vi.spyOn(out, 'warn').mockImplementation(() => {});
    const failedDoc = { ...cachedDoc, _status: DocSyncStatus.DOC_ERROR };
    const result = filterDocs(
      [failedDoc],
      [{ id: 'cached', updateTime: 1, properties: { title: 'Cached' } }],
    );

    expect(result.docList).toHaveLength(1);
    expect(result.docStatusMap.cached._status).toBe(DocSyncStatus.UPDATE);
    expect(warn).toHaveBeenCalledWith(
      '上次同步时【Cached】存在图片/文档下载失败，本次将尝试重新同步。如果并不需要当前文档参与本次同步，请在缓存文件（默认为 elog.cache.json）中找到此文档并删除 _status 字段',
    );
  });

  it('returns empty result when malformed docs cause filtering errors', () => {
    const warn = vi.spyOn(out, 'warn').mockImplementation(() => {});
    vi.spyOn(out, 'debug').mockImplementation(() => {});
    const malformedDoc = {
      ...cachedDoc,
      properties: undefined,
      _status: DocSyncStatus.DOC_ERROR,
    } as unknown as DocDetail;

    const result = filterDocs(
      [malformedDoc],
      [{ id: 'cached', updateTime: 1, properties: { title: 'Cached' } }],
    );

    expect(result).toEqual({ docList: [], docStatusMap: {} });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('增量更新失败，请检查文档'));
  });
});
