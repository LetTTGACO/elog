import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDocDetailList } from './form';

describe('getDocDetailList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty download result instead of exiting when no docs changed', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit should not be called');
    });

    const result = await getDocDetailList({
      cachedDocList: [
        {
          id: 'a',
          title: 'A',
          updateTime: 1,
          body: 'A',
          properties: { title: 'A', urlname: 'a' },
        },
      ],
      async getSortedDocList() {
        return [{ id: 'a', updateTime: 1, properties: { title: 'A' } }];
      },
      async getDocDetail() {
        throw new Error('should not download unchanged doc');
      },
      limit: 1,
    });

    expect(exitSpy).not.toHaveBeenCalled();
    expect(result.docDetailList).toEqual([]);
    expect(result.sortedDocList).toEqual([{ id: 'a', updateTime: 1, properties: { title: 'A' } }]);
    expect(result.docStatusMap).toEqual({});
  });
});
