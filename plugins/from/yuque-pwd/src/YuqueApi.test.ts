import { describe, expect, it, vi } from 'vitest';
import type { PluginContext } from '@elog/cli';
import YuqueApi from './YuqueApi';

function createContext(http = vi.fn()) {
  return {
    http,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: (message: string) => {
        throw new Error(message);
      },
    },
  } as unknown as PluginContext;
}

describe('YuqueApi', () => {
  it('passes latexCode through to the markdown request', async () => {
    const http = vi.fn().mockResolvedValue({ data: '# body' });
    const api = new YuqueApi(
      {
        username: 'user@example.com',
        password: 'password',
        login: 'elog',
        repo: 'docs',
        latexCode: true,
      },
      createContext(http),
    );
    (api as unknown as { yuqueCookie: { data: string } }).yuqueCookie = { data: 'cookie=value' };

    await api.getDocString('hello');

    expect(http).toHaveBeenCalledWith(
      'https://www.yuque.com/elog/docs/hello/markdown',
      expect.objectContaining({
        data: expect.objectContaining({
          latexcode: true,
        }),
      }),
    );
  });
});
