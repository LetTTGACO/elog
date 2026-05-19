import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PluginContext } from '@elogx-test/elog';
import NotionApi from './NotionApi';

const notionQueryMock = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function Client() {
    return {
      databases: {
        query: notionQueryMock.query,
      },
    };
  }),
}));

vi.mock('notion-to-md', () => ({
  NotionToMarkdown: vi.fn(function NotionToMarkdown() {
    return {
      pageToMarkdown: vi.fn(),
      toMarkdownString: vi.fn(),
    };
  }),
}));

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

function createPage(id: string, title: string) {
  return {
    id,
    created_time: '2026-01-01T00:00:00.000Z',
    last_edited_time: '2026-01-02T00:00:00.000Z',
    properties: {
      title: {
        type: 'title',
        title: [{ plain_text: title }],
      },
    },
  };
}

describe('NotionApi', () => {
  beforeEach(() => {
    notionQueryMock.query.mockReset();
  });

  it('collects documents from every paginated database query', async () => {
    notionQueryMock.query
      .mockResolvedValueOnce({
        results: [createPage('page-1', 'Page 1')],
        has_more: true,
        next_cursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        results: [createPage('page-2', 'Page 2')],
        has_more: false,
        next_cursor: null,
      });

    const api = new NotionApi(
      {
        token: 'token',
        databaseId: 'database',
      },
      createCtx(),
    );

    const docs = await api.getSortedDocList();

    expect(docs.map((doc) => doc.id)).toEqual(['page-1', 'page-2']);
    expect(notionQueryMock.query).toHaveBeenCalledTimes(2);
    expect(notionQueryMock.query.mock.calls[1][0]).toMatchObject({
      start_cursor: 'cursor-2',
    });
  });
});
