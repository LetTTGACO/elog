import { describe, expect, it, vi } from 'vitest';
import type { DocDetail, PluginContext, SortedDoc } from '@elog/cli';
import NotionClient from './NotionClient';
import type { NotionDoc } from './types';

vi.mock('./NotionApi', () => {
  class MockNotionApi {
    private readonly docs: Array<SortedDoc<NotionDoc>> = [
      {
        id: 'page-1',
        updateTime: 1,
        properties: {
          title: 'Page 1',
          urlname: 'page-1',
        },
      } as SortedDoc<NotionDoc>,
    ];

    async getSortedDocList() {
      if (!(this instanceof MockNotionApi)) {
        throw new Error('lost NotionApi binding while listing documents');
      }
      return this.docs;
    }

    async getDocDetail(doc: SortedDoc<NotionDoc>): Promise<DocDetail> {
      if (!(this instanceof MockNotionApi)) {
        throw new Error('lost NotionApi binding while downloading documents');
      }
      return {
        id: doc.id,
        title: doc.properties.title,
        updateTime: doc.updateTime,
        body: 'body',
        properties: doc.properties,
      };
    }
  }

  return {
    default: MockNotionApi,
  };
});

function createCtx(): PluginContext {
  return {
    workflow: {
      id: 'test',
      cacheFilePath: 'elog.cache.json',
    },
    logger: {
      debug: vi.fn(),
      success: vi.fn(),
      error: ((message: string) => {
        throw new Error(message);
      }) as PluginContext['logger']['error'],
      info: vi.fn(),
      warn: vi.fn(),
    },
    http: vi.fn() as unknown as PluginContext['http'],
    cache: {
      docList: [],
    },
    image: {} as PluginContext['image'],
  };
}

describe('NotionClient', () => {
  it('keeps NotionApi method bindings when using the shared download flow', async () => {
    const client = new NotionClient(
      {
        token: 'token',
        databaseId: 'database',
      },
      createCtx(),
    );

    const result = await client.getDocDetailList();

    expect(result.docDetailList).toHaveLength(1);
    expect(result.docDetailList[0]?.id).toBe('page-1');
  });
});
