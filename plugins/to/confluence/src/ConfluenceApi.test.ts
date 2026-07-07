import { describe, expect, it, vi } from 'vitest';
import type { DocDetail, PluginContext } from '@elog/plugin-sdk';
import ConfluenceApi from './ConfluenceApi';

function createCtx() {
  const ctx: PluginContext = {
    workflow: { id: 'test', cacheFilePath: 'elog.cache.json' },
    logger: {
      debug: vi.fn(),
      success: vi.fn(),
      error: ((message: string) => {
        throw new Error(message);
      }) as PluginContext['logger']['error'],
      info: vi.fn(),
      warn: vi.fn(),
    },
    http: vi.fn().mockResolvedValue({ data: { id: 'page-1' } }) as unknown as PluginContext['http'],
    cache: { docList: [] },
    image: {} as PluginContext['image'],
  };
  return ctx;
}

function createDoc(overrides: Partial<DocDetail> = {}): DocDetail {
  return {
    id: 'doc-1',
    title: 'Doc 1',
    updateTime: 1,
    body: 'h1. Hello',
    bodyType: 'confluence-wiki',
    properties: { title: 'Doc 1', urlname: 'doc-1' },
    ...overrides,
  };
}

function createApi(ctx: PluginContext) {
  return new ConfluenceApi(
    {
      baseUrl: 'https://confluence.example',
      user: 'user',
      password: 'password',
      spaceKey: 'SPACE',
      rootPageId: 'root',
    },
    ctx,
  );
}

describe('ConfluenceApi', () => {
  it('sends the current Document Body as wiki content when creating pages', async () => {
    const ctx = createCtx();
    const api = createApi(ctx);

    await api.createPage(createDoc({ body: 'h1. Hello' }));

    expect(ctx.http).toHaveBeenCalledWith(
      'https://confluence.example/content',
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          body: {
            wiki: {
              value: 'h1. Hello',
              representation: 'wiki',
            },
          },
        }),
      }),
    );
  });

  it('sends the current Document Body as wiki content when updating pages', async () => {
    const ctx = createCtx();
    const api = createApi(ctx);

    await api.updatePage(createDoc({ body: '* Hello' }), 'page-1', 3);

    expect(ctx.http).toHaveBeenCalledWith(
      'https://confluence.example/content/page-1',
      expect.objectContaining({
        method: 'PUT',
        data: expect.objectContaining({
          version: { number: 3 },
          body: {
            wiki: {
              value: '* Hello',
              representation: 'wiki',
            },
          },
        }),
      }),
    );
  });
});
