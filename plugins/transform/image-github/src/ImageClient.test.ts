import { setImmediate } from 'node:timers/promises';
import type { DocDetail, PluginContext } from '@elog/plugin-sdk';
import { describe, expect, it, vi } from 'vitest';
import imageGithub from './index';

describe('GitHub image transform', () => {
  it('replaces every image when concurrent repository writes would conflict', async () => {
    const imageUrls = ['one', 'two', 'three'].map((name) => `https://images.example.com/${name}`);
    const publicBase = 'https://raw.githubusercontent.com/user/images/master';
    const uploaded = new Map<string, string>();
    let writing = false;
    const http = vi.fn(async (url: string, options: { method: string }) => {
      const key = url.split('/contents/')[1]!;
      if (options.method === 'GET') {
        const downloadUrl = uploaded.get(key);
        return {
          status: downloadUrl ? 200 : 404,
          headers: {},
          data: { download_url: downloadUrl },
        };
      }
      if (writing) {
        return { status: 409, headers: {}, data: { message: 'Concurrent repository write' } };
      }
      writing = true;
      await setImmediate();
      const downloadUrl = `${publicBase}/${key}`;
      uploaded.set(key, downloadUrl);
      writing = false;
      return { status: 201, headers: {}, data: { content: { download_url: downloadUrl } } };
    });
    const ctx: PluginContext = {
      workflow: { id: 'test', cacheFilePath: 'elog.cache.json' },
      logger: {
        debug: vi.fn(),
        success: vi.fn(),
        error(message): never {
          throw new Error(message);
        },
        info: vi.fn(),
        warn: vi.fn(),
      },
      http: http as unknown as PluginContext['http'],
      cache: { docList: [] },
      image: {
        genUniqueIdFromUrl: (url) => new URL(url).pathname.slice(1),
        getFileTypeFromUrl: vi.fn(),
        getFileTypeFromBuffer: vi.fn(),
        cleanUrlParam: (url) => url,
        getUrlListFromContent: (content) =>
          imageUrls
            .filter((url) => content.includes(url))
            .map((url) => ({ originalUrl: url, data: url, type: 'url' as const })),
        getBaseUrl: vi.fn(),
        getFileType: vi.fn(async () => ({ type: 'png', mime: 'image/png' })),
        getBufferFromUrl: vi.fn(async () => Buffer.from('image')),
        getImageDataUrl: vi.fn(),
        formatImagePrefix: () => 'test/',
      },
    };
    const doc: DocDetail = {
      id: 'doc',
      title: 'Doc',
      updateTime: 1,
      properties: { title: 'Doc', urlname: 'doc' },
      body: imageUrls.map((url) => `![image](${url})`).join('\n'),
    };
    const plugin = imageGithub({ user: 'user', repo: 'images', token: 'fixture-token' });

    const [result] = await plugin.transform([doc], ctx);

    expect(uploaded.size).toBe(3);
    expect(result!.body).toBe(
      ['one', 'two', 'three'].map((name) => `![image](${publicBase}/test/${name}.png)`).join('\n'),
    );
  });
});
