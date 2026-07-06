import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocDetail, PluginContext } from '@elog/cli';
import HaloDeploy from './HaloDeploy';

vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils')>();
  return {
    ...actual,
    delay: vi.fn(),
  };
});

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
    http: vi.fn() as unknown as PluginContext['http'],
    cache: { docList: [] },
    image: {
      getUrlListFromContent: vi.fn().mockReturnValue([{ data: 'https://example.com/a.png' }]),
      getBaseUrl: vi.fn((url: string) => ({ data: url, originalUrl: url })),
      genUniqueIdFromUrl: vi.fn().mockReturnValue('image-id'),
      getFileType: vi.fn().mockResolvedValue({ type: 'png' }),
      getBufferFromUrl: vi.fn().mockResolvedValue(Buffer.from('image')),
    } as unknown as PluginContext['image'],
  };
  return ctx;
}

function createApi(overrides: Record<string, unknown> = {}) {
  return {
    getPostList: vi.fn().mockResolvedValue({ items: [] }),
    getCategories: vi.fn().mockResolvedValue({ items: [] }),
    createCategory: vi.fn().mockImplementation(async (category: any) => ({
      ...category,
      metadata: { name: category.spec.displayName },
    })),
    getTags: vi.fn().mockResolvedValue({ items: [] }),
    createTag: vi.fn().mockImplementation(async (tag: any) => ({
      ...tag,
      metadata: { name: tag.spec.displayName },
    })),
    getAttachments: vi.fn().mockResolvedValue({ items: [] }),
    uploadAttachment: vi.fn().mockResolvedValue({
      metadata: { name: 'attachment-1' },
      status: {},
      spec: { displayName: 'image-id.png' },
    }),
    getAttachmentPermalink: vi.fn().mockResolvedValue('https://halo.example/image-id.png'),
    createPost: vi.fn().mockResolvedValue({}),
    updatePostInfo: vi.fn().mockResolvedValue({}),
    updatePostContent: vi.fn().mockResolvedValue({}),
    publishPost: vi.fn().mockResolvedValue({}),
    unpublishPost: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function createDoc(properties: Partial<DocDetail['properties']> = {}): DocDetail {
  return {
    id: 'doc-1',
    title: 'Doc 1',
    updateTime: 1,
    body: '<h1>Hello</h1>',
    bodyType: 'html',
    properties: {
      title: 'Doc 1',
      urlname: 'doc-1',
      cover: '',
      excerpt: 'Excerpt',
      categories: ['Missing category'],
      tags: ['Missing tag'],
      date: '2026-07-01T10:30:00.000Z',
      ...properties,
    },
  };
}

function createDeploy(ctx: PluginContext, api: ReturnType<typeof createApi>, config = {}) {
  const deploy = new HaloDeploy(
    {
      endpoint: 'https://halo.example',
      token: 'token',
      ...config,
    },
    ctx,
  );
  Object.assign(deploy, { api });
  return deploy;
}

describe('HaloDeploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends HTML body as rendered post content', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([createDoc({ categories: [], tags: [] })]);

    const params = api.createPost.mock.calls[0][0];
    expect(params.content.content).toBe('<h1>Hello</h1>');
  });

  it('uses raw body metadata as editable source content', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([
      {
        ...createDoc({ categories: [], tags: [] }),
        rawBody: '# Hello',
        rawBodyType: 'markdown',
      },
    ]);

    const params = api.createPost.mock.calls[0][0];
    expect(params.content.raw).toBe('# Hello');
    expect(params.content.rawType).toBe('markdown');
  });

  it('falls back to HTML body as editable source content', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([createDoc({ categories: [], tags: [] })]);

    const params = api.createPost.mock.calls[0][0];
    expect(params.content.raw).toBe('<h1>Hello</h1>');
    expect(params.content.rawType).toBe('html');
  });

  it('rejects Markdown body input before Halo side effects', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await expect(
      deploy.deploy([
        {
          ...createDoc({ categories: [], tags: [] }),
          body: '# Hello',
          bodyType: 'markdown',
        },
      ]),
    ).rejects.toThrow('Markdown-to-HTML Body Transform');

    expect(api.getPostList).not.toHaveBeenCalled();
    expect(api.createPost).not.toHaveBeenCalled();
  });

  it('rejects missing body type as Markdown before Halo side effects', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);
    const { bodyType: _bodyType, ...doc } = createDoc({ categories: [], tags: [] });

    await expect(deploy.deploy([doc])).rejects.toThrow('Markdown-to-HTML Body Transform');

    expect(api.getPostList).not.toHaveBeenCalled();
    expect(api.createPost).not.toHaveBeenCalled();
  });

  it('writes document dates and parses boolean-like properties', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([
      createDoc({
        publish: 'false',
        public: 'false',
        pinned: 'true',
        autoExcerpt: 'false',
      }),
    ]);

    const params = api.createPost.mock.calls[0][0];
    expect(params.post.metadata.creationTimestamp).toBe('2026-07-01T10:30:00.000Z');
    expect(params.post.spec.publishTime).toBe('2026-07-01T10:30:00.000Z');
    expect(params.post.spec.visible).toBe('PRIVATE');
    expect(params.post.spec.pinned).toBe(true);
    expect(params.post.spec.excerpt.autoGenerate).toBe(false);
    expect(api.unpublishPost).toHaveBeenCalledWith('doc-1');
    expect(api.publishPost).not.toHaveBeenCalled();
  });

  it('warns and skips invalid document dates', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([createDoc({ date: 'not-a-date' })]);

    const params = api.createPost.mock.calls[0][0];
    expect(params.post.metadata.creationTimestamp).toBeUndefined();
    expect(params.post.spec.publishTime).toBeUndefined();
    expect(ctx.logger.warn).toHaveBeenCalledWith('Doc 1 文档日期无效，跳过日期同步: not-a-date');
  });

  it('writes document dates on update', async () => {
    const ctx = createCtx();
    const api = createApi({
      getPostList: vi.fn().mockResolvedValueOnce({
        items: [
          {
            post: {
              metadata: { name: 'doc-1' },
              spec: {
                excerpt: {},
              },
            },
            content: {},
          },
        ],
      }),
    });
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([createDoc({ categories: [], tags: [] })]);

    const post = api.updatePostInfo.mock.calls[0][1];
    expect(post.metadata.creationTimestamp).toBe('2026-07-01T10:30:00.000Z');
    expect(post.spec.publishTime).toBe('2026-07-01T10:30:00.000Z');
  });

  it('skips missing category and tag ids after creation warnings', async () => {
    const ctx = createCtx();
    const api = createApi({
      createCategory: vi.fn().mockRejectedValue(new Error('no category')),
      createTag: vi.fn().mockRejectedValue(new Error('no tag')),
    });
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([createDoc()]);

    const params = api.createPost.mock.calls[0][0];
    expect(params.post.spec.categories).toEqual([]);
    expect(params.post.spec.tags).toEqual([]);
    expect(ctx.logger.warn).toHaveBeenCalledWith('Missing category 分类不存在，已跳过该文档关联');
    expect(ctx.logger.warn).toHaveBeenCalledWith('Missing tag 标签不存在，已跳过该文档关联');
  });

  it('skips publish state changes after create or update failure', async () => {
    const ctx = createCtx();
    const api = createApi({
      createPost: vi.fn().mockRejectedValueOnce(new Error('create failed')),
      getPostList: vi.fn().mockResolvedValueOnce({
        items: [
          {
            post: {
              metadata: { name: 'doc-2' },
              spec: {
                excerpt: {},
              },
            },
            content: {},
          },
        ],
      }),
      updatePostInfo: vi.fn().mockRejectedValueOnce(new Error('update failed')),
    });
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([
      createDoc(),
      { ...createDoc({ title: 'Doc 2', urlname: 'doc-2' }), id: 'doc-2' },
    ]);

    expect(api.publishPost).not.toHaveBeenCalled();
    expect(api.unpublishPost).not.toHaveBeenCalled();
  });

  it('uses the old image upload config name when the new name is absent', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api, { needUploadImage: true });

    await deploy.deploy([createDoc({ categories: [], tags: [] })]);

    expect(api.uploadAttachment).toHaveBeenCalledOnce();
  });
});
