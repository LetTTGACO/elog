import { describe, expect, it, vi } from 'vitest';
import type { DocDetail, PluginContext } from '@elog/plugin-sdk';
import markdownToConfluenceWiki from './index';

function createCtx(): PluginContext {
  return {
    workflow: { id: 'test', cacheFilePath: 'elog.cache.json' },
    logger: {
      debug: vi.fn(),
      success: vi.fn(),
      error(message: string): never {
        throw new Error(message);
      },
      info: vi.fn(),
      warn: vi.fn(),
    },
    http: vi.fn() as unknown as PluginContext['http'],
    cache: { docList: [] },
    image: {} as PluginContext['image'],
  };
}

function createDoc(overrides: Partial<DocDetail> = {}): DocDetail {
  return {
    id: 'doc-1',
    title: 'Doc 1',
    updateTime: 1,
    body: '# Hello',
    bodyType: 'markdown',
    properties: { title: 'Doc 1', urlname: 'doc-1' },
    ...overrides,
  };
}

describe('markdownToConfluenceWiki', () => {
  it('renders Markdown body to Confluence wiki markup', async () => {
    const plugin = markdownToConfluenceWiki();

    const docs = await plugin.transform([createDoc()], createCtx());

    expect(docs[0]).toMatchObject({
      body: expect.stringContaining('h1. Hello'),
      bodyType: 'confluence-wiki',
    });
  });

  it('treats a missing body type as Markdown', async () => {
    const plugin = markdownToConfluenceWiki();

    const docs = await plugin.transform([createDoc({ bodyType: undefined })], createCtx());

    expect(docs[0].bodyType).toBe('confluence-wiki');
    expect(docs[0].body).toContain('h1. Hello');
  });

  it('fails clearly for non-Markdown input', async () => {
    const plugin = markdownToConfluenceWiki();

    await expect(
      plugin.transform([createDoc({ body: '<h1>Hello</h1>', bodyType: 'html' })], createCtx()),
    ).rejects.toThrow('transform:markdown-to-confluence-wiki expects Markdown body input');
  });
});
