import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocDetail, PluginContext } from '@elog/plugin-sdk';
import ConfluenceDeploy from './ConfluenceDeploy';

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
    image: {} as PluginContext['image'],
  };
  return ctx;
}

function createApi(overrides: Record<string, unknown> = {}) {
  return {
    getRootPageList: vi.fn().mockResolvedValue([]),
    getPageById: vi.fn(),
    createPage: vi.fn().mockResolvedValue({
      id: 'page-1',
      title: 'Doc 1',
      status: 'current',
      type: 'page',
    }),
    updatePage: vi.fn(),
    ...overrides,
  };
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

function createDeploy(ctx: PluginContext, api: ReturnType<typeof createApi>) {
  const deploy = new ConfluenceDeploy(
    {
      baseUrl: 'https://confluence.example',
      user: 'user',
      password: 'password',
      spaceKey: 'SPACE',
      rootPageId: 'root',
    },
    ctx,
  );
  Object.assign(deploy, { api });
  return deploy;
}

describe('ConfluenceDeploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates pages from Confluence wiki body without target-side Markdown rendering', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await deploy.deploy([createDoc({ body: '# Already wiki-ish' })]);

    expect(api.createPage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '# Already wiki-ish',
        bodyType: 'confluence-wiki',
      }),
      '',
    );
  });

  it('rejects Markdown body input before Confluence side effects', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);

    await expect(
      deploy.deploy([createDoc({ body: '# Hello', bodyType: 'markdown' })]),
    ).rejects.toThrow('Markdown-to-Confluence wiki Body Transform');

    expect(api.getRootPageList).not.toHaveBeenCalled();
    expect(api.createPage).not.toHaveBeenCalled();
  });

  it('rejects missing body type as Markdown before Confluence side effects', async () => {
    const ctx = createCtx();
    const api = createApi();
    const deploy = createDeploy(ctx, api);
    const { bodyType: _bodyType, ...doc } = createDoc({ body: '# Hello' });

    await expect(deploy.deploy([doc])).rejects.toThrow(
      'Markdown-to-Confluence wiki Body Transform',
    );

    expect(api.getRootPageList).not.toHaveBeenCalled();
    expect(api.createPage).not.toHaveBeenCalled();
  });
});
