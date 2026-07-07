import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocDetail, PluginContext } from '@elog/plugin-sdk';
import WordPressDeploy from './WordPressDeploy';

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
      getUrlListFromContent: vi.fn().mockReturnValue([]),
      getBaseUrl: vi.fn((url: string) => ({ data: url, originalUrl: url, type: 'url' })),
      cleanUrlParam: vi.fn((url: string) => url.split(/[?#]/)[0]),
      genUniqueIdFromUrl: vi.fn().mockReturnValue('image-id'),
      getFileType: vi.fn().mockResolvedValue({ type: 'png' }),
      getBufferFromUrl: vi.fn().mockResolvedValue(Buffer.from('image')),
    } as unknown as PluginContext['image'],
  };
  return ctx;
}

function createApi(overrides: Record<string, unknown> = {}) {
  return {
    getAllPosts: vi.fn().mockResolvedValue([]),
    getAllTags: vi.fn().mockResolvedValue([]),
    getAllCategories: vi.fn().mockResolvedValue([]),
    getAllMedia: vi.fn().mockResolvedValue([]),
    createTag: vi.fn(),
    createCategory: vi.fn(),
    uploadMedia: vi.fn().mockResolvedValue({
      id: 10,
      guid: { rendered: 'https://wp.example/uploads/image-id.png' },
      title: { rendered: 'image-id.png' },
    }),
    createPost: vi.fn().mockResolvedValue({
      id: 1,
      title: { rendered: 'Doc 1' },
    }),
    updatePost: vi.fn(),
    ...overrides,
  };
}

function createDoc(overrides: Partial<DocDetail> = {}): DocDetail {
  return {
    id: 'doc-1',
    title: 'Doc 1',
    updateTime: 1,
    body: '<h1>Hello</h1>',
    bodyType: 'html',
    properties: {
      title: 'Doc 1',
      urlname: 'doc-1',
      categories: [],
      tags: [],
    },
    ...overrides,
  };
}

function createDeploy(ctx: PluginContext, api: ReturnType<typeof createApi>, config = {}) {
  const deploy = new WordPressDeploy(
    {
      endpoint: 'https://wp.example/wp-json',
      username: 'user',
      password: 'app-password',
      ...config,
    },
    ctx,
  );
  Object.assign(deploy, { api });
  return deploy;
}

describe('WordPressDeploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends HTML body as post content without target-side Markdown rendering', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([createDoc({ body: '<p>Hello</p>' })]);

    expect(api.createPost).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '<p>Hello</p>',
      }),
    );
  });

  it('rejects Markdown body input before WordPress side effects', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await expect(
      deploy.deploy([createDoc({ body: '# Hello', bodyType: 'markdown' })]),
    ).rejects.toThrow('Markdown-to-HTML Body Transform');

    expect(api.getAllPosts).not.toHaveBeenCalled();
    expect(api.createPost).not.toHaveBeenCalled();
  });

  it('rejects missing body type as Markdown before WordPress side effects', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);
    const { bodyType: _bodyType, ...doc } = createDoc({ body: '# Hello' });

    await expect(deploy.deploy([doc])).rejects.toThrow('Markdown-to-HTML Body Transform');

    expect(api.getAllPosts).not.toHaveBeenCalled();
    expect(api.createPost).not.toHaveBeenCalled();
  });

  it('uploads and rewrites images from the current HTML body', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api, { enableUploadImage: true });

    await deploy.deploy([
      createDoc({ body: '<p>Hello</p><img src="https://assets.example/a.png?x=1" alt="A">' }),
    ]);

    expect(api.uploadMedia).toHaveBeenCalledWith(Buffer.from('image'), 'image-id.png');
    expect(api.createPost).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '<p>Hello</p><img src="https://wp.example/uploads/image-id.png" alt="A">',
      }),
    );
  });
});
