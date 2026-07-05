import { beforeEach, describe, expect, it, vi } from 'vitest';
import COSApi from './ImageApi';
import type { PluginContext } from '@elog/cli';

const headObjectMock = vi.hoisted(() => vi.fn());
const putObjectMock = vi.hoisted(() => vi.fn());
const COSMock = vi.hoisted(() =>
  vi.fn(function () {
    return {
      headObject: headObjectMock,
      putObject: putObjectMock,
    };
  }),
);

vi.mock('cos-nodejs-sdk-v5', () => ({
  default: COSMock,
}));

const createCtx = (): PluginContext =>
  ({
    workflow: { id: 'test', cacheFilePath: 'elog.cache.json' },
    logger: {
      debug: vi.fn(),
      success: vi.fn(),
      error(head: string): never {
        throw new Error(head);
      },
      info: vi.fn(),
      warn: vi.fn(),
    },
    cache: { docList: [] },
    http: vi.fn(),
    image: {
      formatImagePrefix(prefix?: string) {
        const value = prefix?.replace(/^\/+/, '').replace(/\/+$/, '');
        return value ? `${value}/` : '';
      },
    },
  }) as unknown as PluginContext;

describe('COSApi', () => {
  beforeEach(() => {
    headObjectMock.mockReset();
    putObjectMock.mockReset();
  });

  it.each([
    { prefixKey: '/elog/images//', expectedKey: 'elog/images/hash.png' },
    { prefixKey: undefined, expectedKey: 'hash.png' },
  ])(
    'uses one object key for checking and uploading when prefixKey is $prefixKey',
    async (item) => {
      headObjectMock.mockResolvedValue({});
      putObjectMock.mockResolvedValue({
        Location: `bucket.cos.ap-shanghai.myqcloud.com/${item.expectedKey}`,
      });
      const api = new COSApi(
        {
          secretId: 'secret-id',
          secretKey: 'secret-key',
          bucket: 'bucket',
          region: 'ap-shanghai',
          host: 'cdn.example.com',
          prefixKey: item.prefixKey,
        },
        createCtx(),
      );

      await expect(api.hasImage('hash.png')).resolves.toBe(
        `https://cdn.example.com/${item.expectedKey}`,
      );
      await expect(api.uploadImage('hash.png', Buffer.from('image'))).resolves.toBe(
        `https://cdn.example.com/${item.expectedKey}`,
      );

      expect(headObjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ Key: item.expectedKey }),
      );
      expect(putObjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ Key: item.expectedKey }),
      );
    },
  );
});
