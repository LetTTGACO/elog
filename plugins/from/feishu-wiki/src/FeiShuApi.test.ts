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

describe('FeiShuApi wiki tree', () => {
  it('keeps leaf docs with empty children when parent docs are disabled', async () => {
    const api = Object.create(FeiShuApi.prototype) as FeiShuApi;
    api.config = {
      appId: 'app',
      appSecret: 'secret',
      wikiId: 'wiki',
      disableParentDoc: true,
    };
    api.feishu = {
      getReposNodesTree: vi.fn().mockResolvedValue([
        {
          obj_type: 'docx',
          obj_token: 'home-token',
          title: '首页',
          obj_create_time: '1',
          obj_edit_time: '2',
          children: [
            {
              obj_type: 'docx',
              obj_token: 'child-token',
              title: '首页下的文档',
              obj_create_time: '3',
              obj_edit_time: '4',
              children: [
                {
                  obj_type: 'docx',
                  obj_token: 'leaf-token',
                  title: '四级文档',
                  obj_create_time: '5',
                  obj_edit_time: '6',
                  children: [],
                },
              ],
            },
          ],
        },
        {
          obj_type: 'docx',
          obj_token: 'sibling-token',
          title: '测试',
          obj_create_time: '7',
          obj_edit_time: '8',
        },
      ]),
    } as any;

    const docs = await api.getSortedDocList();

    expect(docs.map((doc) => doc.title)).toEqual(['四级文档', '测试']);
    expect(docs[0].catalog).toEqual([
      { title: '首页', doc_id: 'home-token' },
      { title: '首页下的文档', doc_id: 'child-token' },
    ]);
  });
});
