import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PluginContext } from '@elogx-test/elog';
import NotionApi from './NotionApi';

const notionMocks = vi.hoisted(() => ({
  clientOptions: undefined as unknown,
  queryDataSource: vi.fn(),
  retrieveDatabase: vi.fn(),
  retrieveMarkdown: vi.fn(),
  notionToMarkdownOptions: undefined as unknown,
  pageToMarkdown: vi.fn(),
  toMarkdownString: vi.fn(),
}));

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(function Client(options) {
    notionMocks.clientOptions = options;
    return {
      dataSources: {
        query: notionMocks.queryDataSource,
      },
      databases: {
        retrieve: notionMocks.retrieveDatabase,
      },
      pages: {
        retrieveMarkdown: notionMocks.retrieveMarkdown,
      },
    };
  }),
}));

vi.mock('notion-to-md', () => ({
  NotionToMarkdown: vi.fn(function NotionToMarkdown(options) {
    notionMocks.notionToMarkdownOptions = options;
    return {
      pageToMarkdown: notionMocks.pageToMarkdown,
      toMarkdownString: notionMocks.toMarkdownString,
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
    notionMocks.clientOptions = undefined as unknown;
    notionMocks.queryDataSource.mockReset();
    notionMocks.retrieveDatabase.mockReset();
    notionMocks.retrieveMarkdown.mockReset();
    notionMocks.notionToMarkdownOptions = undefined as unknown;
    notionMocks.pageToMarkdown.mockReset();
    notionMocks.toMarkdownString.mockReset();
  });

  it('collects documents from every paginated data source query', async () => {
    notionMocks.retrieveDatabase.mockResolvedValueOnce({
      data_sources: [{ id: 'source-1', name: 'Default' }],
    });
    notionMocks.queryDataSource
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
    expect(notionMocks.queryDataSource).toHaveBeenCalledTimes(2);
    expect(notionMocks.queryDataSource.mock.calls[1][0]).toMatchObject({
      start_cursor: 'cursor-2',
    });
  });

  it('queries the configured data source without retrieving the database', async () => {
    notionMocks.queryDataSource.mockResolvedValueOnce({
      results: [createPage('page-1', 'Page 1')],
      has_more: false,
      next_cursor: null,
    });

    const api = new NotionApi(
      {
        token: 'token',
        dataSourceId: 'source-1',
      },
      createCtx(),
    );

    const docs = await api.getSortedDocList();

    expect(docs.map((doc) => doc.id)).toEqual(['page-1']);
    expect(notionMocks.retrieveDatabase).not.toHaveBeenCalled();
    expect(notionMocks.queryDataSource).toHaveBeenCalledWith(
      expect.objectContaining({ data_source_id: 'source-1' }),
    );
    expect(notionMocks.clientOptions).toMatchObject({ notionVersion: '2026-03-11' });
  });

  it('resolves a data source id from legacy databaseId config', async () => {
    notionMocks.retrieveDatabase.mockResolvedValueOnce({
      data_sources: [{ id: 'source-from-database', name: 'Default' }],
    });
    notionMocks.queryDataSource.mockResolvedValueOnce({
      results: [createPage('page-1', 'Page 1')],
      has_more: false,
      next_cursor: null,
    });

    const api = new NotionApi(
      {
        token: 'token',
        databaseId: 'database-1',
      },
      createCtx(),
    );

    await api.getSortedDocList();

    expect(notionMocks.retrieveDatabase).toHaveBeenCalledWith({ database_id: 'database-1' });
    expect(notionMocks.queryDataSource).toHaveBeenCalledWith(
      expect.objectContaining({ data_source_id: 'source-from-database' }),
    );
  });

  it('downloads page markdown through notion-to-md', async () => {
    const blocks = [{ parent: '# Page 1', children: [] }];
    notionMocks.pageToMarkdown.mockResolvedValueOnce(blocks);
    notionMocks.toMarkdownString.mockReturnValueOnce({ parent: '# Page 1\ncontent' });

    const api = new NotionApi(
      {
        token: 'token',
        dataSourceId: 'source-1',
        imgToBase64: true,
      },
      createCtx(),
    );

    const detail = await api.getDocDetail(createPage('page-1', 'Page 1') as any);

    expect(detail.body).toBe('# Page 1\ncontent');
    expect(notionMocks.pageToMarkdown).toHaveBeenCalledWith('page-1');
    expect(notionMocks.toMarkdownString).toHaveBeenCalledWith(blocks);
    expect(notionMocks.notionToMarkdownOptions).toMatchObject({
      config: { convertImagesToBase64: true },
    });
    expect(notionMocks.retrieveMarkdown).not.toHaveBeenCalled();
  });
});
