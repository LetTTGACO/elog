import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PluginContext } from '@elog/cli';
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

afterEach(() => {
  vi.useRealTimers();
});

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

  it('uploads attachments with native FormData', async () => {
    const { ctx, http } = createCtx();
    const api = new HaloApi(
      {
        endpoint: 'https://halo.example',
        token: 'token',
        policyName: 'default-policy',
        groupName: 'default',
      },
      ctx,
    );

    await api.uploadAttachment(Buffer.from('image'), 'image.png');

    expect(http).toHaveBeenCalledWith(
      'https://halo.example/apis/api.console.halo.run/v1alpha1/attachments/upload',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
    const form = http.mock.calls[0][1].body as FormData;
    expect(form.get('policyName')).toBe('default-policy');
    expect(form.get('groupName')).toBe('default');
    expect(form.get('file')).toBeInstanceOf(Blob);
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
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: createListPage([{ spec: { displayName: 'image-1.png' } }], 1, 2),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: createListPage([{ spec: { displayName: 'image-2.png' } }], 2, 2),
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
    await expect(api.getAttachments()).resolves.toMatchObject({
      items: [{ spec: { displayName: 'image-1.png' } }, { spec: { displayName: 'image-2.png' } }],
    });
    expect(http.mock.calls.map(([, options]) => options.data)).toEqual([
      { labelSelector: 'content.halo.run/deleted=false', page: 1, size: 100 },
      { labelSelector: 'content.halo.run/deleted=false', page: 2, size: 100 },
      { page: 1, size: 100 },
      { page: 2, size: 100 },
      { page: 1, size: 100 },
      { page: 2, size: 100 },
      { page: 1, size: 100 },
      { page: 2, size: 100 },
    ]);
  });

  it('stops polling attachment permalink after a bounded wait', async () => {
    vi.useFakeTimers();
    const { ctx, http } = createCtx();
    http.mockResolvedValue({
      status: 200,
      headers: {},
      data: { status: {} },
    });
    const api = new HaloApi(
      {
        endpoint: 'https://halo.example',
        token: 'token',
      },
      ctx,
    );

    const result = expect(api.getAttachmentPermalink('attachment-1')).rejects.toThrow(
      'Timed out waiting for Halo attachment permalink for attachment-1 after 30 attempts',
    );
    await vi.advanceTimersByTimeAsync(30_000);

    await result;
    expect(http).toHaveBeenCalledTimes(30);
  });
});
