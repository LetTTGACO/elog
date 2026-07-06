import { describe, expect, it, vi } from 'vitest';
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
});
