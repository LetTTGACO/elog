import { describe, expect, it, vi } from 'vitest';
import type { PluginContext } from '@elog/plugin-sdk';
import WordPressApi from './WordPressApi';

type MockHttpResponse = {
  status?: number;
  headers?: Record<string, string>;
  data: unknown;
};

function createCtx(responses: Array<unknown | MockHttpResponse>) {
  const http = vi.fn();
  for (const response of responses) {
    if (
      typeof response === 'object' &&
      response !== null &&
      ('data' in response || 'status' in response || 'headers' in response)
    ) {
      const { status = 200, headers = {}, data = undefined } = response as MockHttpResponse;
      http.mockResolvedValueOnce({ status, headers, data });
      continue;
    }
    http.mockResolvedValueOnce({ status: 200, headers: {}, data: response });
  }
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

function createApi(ctx: PluginContext) {
  return new WordPressApi(
    {
      endpoint: 'https://wp.example/wp-json',
      username: 'user',
      password: 'app-password',
    },
    ctx,
  );
}

describe('WordPressApi', () => {
  it('lists posts through the REST endpoint', async () => {
    const { ctx, http } = createCtx([[{ id: 1, title: { rendered: 'Post' } }]]);
    const api = createApi(ctx);

    const posts = await api.getPostList(50, 2);

    expect(posts).toHaveLength(1);
    expect(http).toHaveBeenCalledWith(
      'https://wp.example/wp-json/wp/v2/posts',
      expect.objectContaining({
        method: 'GET',
        data: { per_page: 50, page: 2 },
      }),
    );
  });

  it('creates posts with basic auth', async () => {
    const { ctx, http } = createCtx([{ id: 1 }]);
    const api = createApi(ctx);

    await api.createPost({ title: 'Title', content: 'Body' } as any);

    expect(http).toHaveBeenCalledWith(
      'https://wp.example/wp-json/wp/v2/posts',
      expect.objectContaining({
        method: 'POST',
        data: { title: 'Title', content: 'Body' },
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('user:app-password').toString('base64')}`,
        }),
      }),
    );
  });

  it('uploads media as multipart form data', async () => {
    const { ctx, http } = createCtx([{ id: 10, source_url: 'https://wp.example/image.png' }]);
    const api = createApi(ctx);

    await api.uploadMedia(Buffer.from('image'), 'image.png');

    expect(http).toHaveBeenCalledWith(
      'https://wp.example/wp-json/wp/v2/media',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
    const form = http.mock.calls[0][1].body as FormData;
    expect(form.get('title')).toBe('image.png');
    expect(form.get('description')).toBe('upload by elog');
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  it('returns accumulated tags when the next page is reported as invalid', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `tag-${index + 1}`,
    }));
    const { ctx } = createCtx([
      { data: firstPage },
      {
        status: 400,
        data: {
          code: 'rest_post_invalid_page_number',
          message: 'The page number requested is larger than the number of pages available.',
        },
      },
    ]);
    const api = createApi(ctx);

    await expect(api.getAllTags()).resolves.toEqual(firstPage);
  });

  it('throws when categories fail for reasons other than invalid page overflow', async () => {
    const { ctx } = createCtx([
      {
        status: 500,
        data: {
          code: 'rest_internal_server_error',
          message: 'Internal Server Error',
        },
      },
    ]);
    const api = createApi(ctx);

    await expect(api.getAllCategories()).rejects.toThrow('获取分类列表失败: Internal Server Error');
  });

  it('throws when tags fail for reasons other than invalid page overflow', async () => {
    const { ctx } = createCtx([
      {
        status: 500,
        data: {
          code: 'rest_internal_server_error',
          message: 'Internal Server Error',
        },
      },
    ]);
    const api = createApi(ctx);

    await expect(api.getAllTags()).rejects.toThrow('获取标签列表失败: Internal Server Error');
  });

  it('returns accumulated categories when the next page is reported as invalid', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `category-${index + 1}`,
    }));
    const { ctx } = createCtx([
      { data: firstPage },
      {
        status: 400,
        data: {
          code: 'rest_post_invalid_page_number',
          message: 'The page number requested is larger than the number of pages available.',
        },
      },
    ]);
    const api = createApi(ctx);

    await expect(api.getAllCategories()).resolves.toEqual(firstPage);
  });
});
