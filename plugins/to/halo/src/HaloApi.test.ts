import { describe, expect, it, vi } from 'vitest';
import type { PluginContext } from '@elog/plugin-sdk';
import HaloApi from './HaloApi';

function createCtx() {
  const http = vi.fn().mockResolvedValue({
    status: 200,
    headers: {},
    data: { metadata: { name: 'image.png' } },
  });
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
    http: http as unknown as PluginContext['http'],
    cache: { docList: [] },
    image: {} as PluginContext['image'],
  };
  return { ctx, http };
}

function createListPage<T>(items: T[], page: number, totalPages: number) {
  return {
    first: page === 1,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    items,
    last: page === totalPages,
    page,
    size: items.length,
    total: items.length * totalPages,
    totalPages,
  };
}

describe('HaloApi', () => {
  it('accepts any 2xx response', async () => {
    const { ctx, http } = createCtx();
    http.mockResolvedValueOnce({
      status: 204,
      headers: {},
      data: undefined,
    });
    const api = new HaloApi(
      {
        endpoint: 'https://halo.example',
        token: 'token',
      },
      ctx,
    );

    await expect(api.publishPost('post-1')).resolves.toBeUndefined();
  });

  it('fails on non-2xx responses', async () => {
    const { ctx, http } = createCtx();
    http.mockResolvedValueOnce({
      status: 400,
      headers: {},
      data: { message: 'bad request' },
    });
    const api = new HaloApi(
      {
        endpoint: 'https://halo.example',
        token: 'token',
      },
      ctx,
    );

    await expect(api.publishPost('post-1')).rejects.toThrow('bad request');
  });

  it('collects all pages for Halo list reads', async () => {
    const { ctx, http } = createCtx();
    http
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: createListPage([{ post: { metadata: { name: 'post-1' } } }], 1, 2),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: createListPage([{ post: { metadata: { name: 'post-2' } } }], 2, 2),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: createListPage([{ spec: { displayName: 'Category 1' } }], 1, 2),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: createListPage([{ spec: { displayName: 'Category 2' } }], 2, 2),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: createListPage([{ spec: { displayName: 'Tag 1' } }], 1, 2),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: createListPage([{ spec: { displayName: 'Tag 2' } }], 2, 2),
      });
    const api = new HaloApi(
      {
        endpoint: 'https://halo.example',
        token: 'token',
      },
      ctx,
    );

    await expect(api.getPostList()).resolves.toMatchObject({
      items: [
        { post: { metadata: { name: 'post-1' } } },
        { post: { metadata: { name: 'post-2' } } },
      ],
    });
    await expect(api.getCategories()).resolves.toMatchObject({
      items: [{ spec: { displayName: 'Category 1' } }, { spec: { displayName: 'Category 2' } }],
    });
    await expect(api.getTags()).resolves.toMatchObject({
      items: [{ spec: { displayName: 'Tag 1' } }, { spec: { displayName: 'Tag 2' } }],
    });
    expect(http.mock.calls.map(([, options]) => options.data)).toEqual([
      { labelSelector: 'content.halo.run/deleted=false', page: 1, size: 100 },
      { labelSelector: 'content.halo.run/deleted=false', page: 2, size: 100 },
      { page: 1, size: 100 },
      { page: 2, size: 100 },
      { page: 1, size: 100 },
      { page: 2, size: 100 },
    ]);
  });
});
