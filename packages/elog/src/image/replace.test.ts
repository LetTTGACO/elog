import { beforeEach, describe, expect, it, vi } from 'vitest';
import { replaceImagesFunc } from './replace';
import type { DocDetail, ImageUploader } from '..';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('../http/request', () => ({
  default: requestMock,
}));

vi.mock('../logging/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('replaceImagesFunc', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('replaces configured image property fields', async () => {
    requestMock.mockResolvedValue({ data: Buffer.from('cover') });
    const uploader: ImageUploader = {
      hasImage: vi.fn().mockResolvedValue(undefined),
      uploadImage: vi.fn().mockResolvedValue('https://cdn.example.com/cover.png'),
    };
    const docs: DocDetail[] = [
      {
        id: 'doc-1',
        title: 'Doc',
        updateTime: 1,
        body: 'No body image',
        properties: {
          title: 'Doc',
          urlname: 'doc-1',
          cover: 'https://notion.example.com/cover.png?token=abc',
        },
      },
    ];

    await replaceImagesFunc(docs, uploader, 10, ['cover']);

    expect(docs[0].properties.cover).toBe('https://cdn.example.com/cover.png');
    expect(uploader.uploadImage).toHaveBeenCalledOnce();
  });

  it('uses the same complete filename when checking and uploading an image', async () => {
    requestMock.mockResolvedValue({ data: Buffer.from('body image') });
    const uploader: ImageUploader = {
      hasImage: vi.fn().mockResolvedValue(undefined),
      uploadImage: vi.fn().mockResolvedValue('https://cdn.example.com/body.png'),
    };
    const docs: DocDetail[] = [
      {
        id: 'doc-1',
        title: 'Doc',
        updateTime: 1,
        body: '![body](https://notion.example.com/body.png?token=abc)',
        properties: {
          title: 'Doc',
          urlname: 'doc-1',
        },
      },
    ];

    await replaceImagesFunc(docs, uploader, 10);

    const checkedName = vi.mocked(uploader.hasImage).mock.calls[0][0];
    const uploadedName = vi.mocked(uploader.uploadImage).mock.calls[0][0];
    expect(checkedName).toBe(uploadedName);
    expect(uploadedName).toMatch(/\.png$/);
  });
});
