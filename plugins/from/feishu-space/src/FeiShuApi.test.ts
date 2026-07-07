import type { PluginContext } from '@elog/plugin-sdk';
import { describe, expect, it, vi } from 'vitest';
import FeiShuApi from './FeiShuApi';

function createTestContext(): PluginContext {
  return {
    workflow: { id: 'test', cacheFilePath: 'elog.cache.json' },
    logger: {
      debug: vi.fn(),
      success: vi.fn(),
      error: (head: string) => {
        throw new Error(head);
      },
      info: vi.fn(),
      warn: vi.fn(),
    },
    http: vi.fn() as PluginContext['http'],
    cache: { docList: [] },
    image: {
      genUniqueIdFromUrl: vi.fn(),
      getFileTypeFromUrl: vi.fn(),
      getFileTypeFromBuffer: vi.fn(),
      cleanUrlParam: vi.fn(),
      getUrlListFromContent: vi.fn(() => [
        { data: 'image-token', originalUrl: 'image-token', type: 'url' as const },
      ]),
      getBaseUrl: vi.fn(),
      getFileType: vi.fn(),
      getBufferFromUrl: vi.fn(),
      getImageDataUrl: vi.fn(),
      formatImagePrefix: vi.fn(),
    },
  };
}

describe('FeiShuApi image resources', () => {
  it('emits downloaded images as data URLs', async () => {
    const image = Buffer.from('feishu image');
    const api = Object.create(FeiShuApi.prototype) as FeiShuApi;
    (api as any).ctx = createTestContext();
    api.feishu = {
      getPageBlocks: vi.fn().mockResolvedValue([]),
      getResourceItem: vi
        .fn()
        .mockResolvedValue({ buffer: { data: image }, type: 'png', name: 'diagram.png' }),
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
