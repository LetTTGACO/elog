import { createPluginContext } from '@elog/cli';
import { describe, expect, it, vi } from 'vitest';
import FeiShuApi from './FeiShuApi';

describe('FeiShuApi image resources', () => {
  it('emits downloaded images as data URLs', async () => {
    const image = Buffer.from('feishu image');
    const api = Object.create(FeiShuApi.prototype) as FeiShuApi;
    (api as any).ctx = createPluginContext({
      workflow: { id: 'test', cacheFilePath: 'elog.cache.json' },
      cachedDocList: [],
    });
    api.feishu = {
      getPageBlocks: vi.fn().mockResolvedValue([]),
      getResourceItem: vi.fn().mockResolvedValue({ buffer: { data: image }, name: 'diagram.png' }),
    } as any;
    api.f2m = {
      toMarkdownString: () => '![diagram](image-token)',
    } as any;

    const detail = await api.getDocDetail({
      id: 'doc-id',
      title: 'Doc',
      updated: 1,
      createdAt: 1,
      updatedAt: 1,
      properties: { title: 'Doc' },
      catalog: [],
    });

    expect(detail.body).toBe(`![diagram](data:image/png;base64,${image.toString('base64')})`);
  });
});
