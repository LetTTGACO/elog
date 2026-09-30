import { describe, expect, it, vi } from 'vitest';
import type { DocDetail } from '../doc';
import type { ImageUploader } from '../image';
import type { PluginContext } from '../plugin';
import { ElogImageContext } from './ImageContext';

const imageBuffer = Buffer.from('decoded-image');
const payload = imageBuffer.toString('base64');
const dataUrl = `data:image/png;base64,${payload}`;
const uploadedUrl = 'https://cdn.test/stable-image.png';

function createContext() {
  return {
    workflow: { id: 'image-test', cacheFilePath: 'elog.cache.json' },
    logger: {
      debug: vi.fn(),
      success: vi.fn(),
      error(head: string): never {
        throw new Error(head);
      },
      info: vi.fn(),
      warn: vi.fn(),
    },
    http: async () => {
      throw new Error('Unexpected HTTP request');
    },
    cache: { docList: [] },
    image: {
      genUniqueIdFromUrl: vi.fn(() => 'stable-image'),
      getFileTypeFromUrl: vi.fn<PluginContext['image']['getFileTypeFromUrl']>(),
      getFileTypeFromBuffer: vi.fn<PluginContext['image']['getFileTypeFromBuffer']>(),
      cleanUrlParam: vi.fn<PluginContext['image']['cleanUrlParam']>(),
      getUrlListFromContent: vi.fn<PluginContext['image']['getUrlListFromContent']>(() => []),
      getBaseUrl: vi.fn<PluginContext['image']['getBaseUrl']>(),
      getFileType: vi.fn<PluginContext['image']['getFileType']>(async () => ({ type: 'png' })),
      getBufferFromUrl: vi.fn(async () => imageBuffer),
      getImageDataUrl: vi.fn<PluginContext['image']['getImageDataUrl']>(() => ({
        type: 'png',
        payload,
        buffer: imageBuffer,
      })),
      formatImagePrefix: vi.fn<PluginContext['image']['formatImagePrefix']>(),
    },
  } satisfies PluginContext;
}

function createDoc(): DocDetail {
  return {
    id: 'doc-1',
    title: 'Doc',
    updateTime: 1,
    body: '',
    properties: { title: 'Doc', urlname: 'doc' },
  };
}

function createUploader() {
  return {
    hasImage: vi.fn<ImageUploader['hasImage']>(async () => undefined),
    uploadImage: vi.fn<ImageUploader['uploadImage']>(async () => uploadedUrl),
  };
}

function createDataUrlCase(location: 'body' | 'cover', url = dataUrl) {
  const ctx = createContext();
  const doc = createDoc();
  if (location === 'body') {
    doc.body = `![pixel](${url})`;
    ctx.image.getUrlListFromContent.mockReturnValue([
      { originalUrl: url, data: url, type: 'base64' },
    ]);
  } else {
    doc.properties.cover = url;
  }
  const helper = new ElogImageContext(ctx, { propertyImageFields: ['cover'] });
  return { ctx, doc, helper, uploader: createUploader() };
}

describe('ElogImageContext', () => {
  it.each(['body', 'cover'] as const)(
    'uploads decoded data URL bytes and replaces %s',
    async (location) => {
      const { ctx, doc, helper, uploader } = createDataUrlCase(location);

      await helper.replaceImages([doc], uploader);

      expect(ctx.image.getImageDataUrl).toHaveBeenCalledExactlyOnceWith(dataUrl);
      expect(ctx.image.getBufferFromUrl).not.toHaveBeenCalled();
      expect(uploader.hasImage).toHaveBeenCalledExactlyOnceWith('stable-image.png');
      expect(uploader.uploadImage).toHaveBeenCalledExactlyOnceWith(
        'stable-image.png',
        imageBuffer,
        doc,
      );
      expect(doc.body).toBe(location === 'body' ? `![pixel](${uploadedUrl})` : '');
      expect(doc.properties.cover).toBe(location === 'cover' ? uploadedUrl : undefined);
      expect(doc.error).toBeUndefined();
    },
  );

  it.each([
    { location: 'body', failure: 'type' },
    { location: 'cover', failure: 'type' },
    { location: 'body', failure: 'decode' },
    { location: 'cover', failure: 'decode' },
  ] as const)(
    'preserves $location and marks failure when data URL $failure fails',
    async ({ location, failure }) => {
      const invalidUrl = 'data:image/png;base64,%%%';
      const { ctx, doc, helper, uploader } = createDataUrlCase(location, invalidUrl);
      const originalBody = doc.body;
      const originalCover = doc.properties.cover;
      if (failure === 'type') {
        ctx.image.getFileType.mockResolvedValue(undefined);
      } else {
        ctx.image.getImageDataUrl.mockReturnValue(undefined);
      }

      await helper.replaceImages([doc], uploader);

      expect(doc.body).toBe(originalBody);
      expect(doc.properties.cover).toBe(originalCover);
      expect(doc.error).toBe(1);
      expect(uploader.uploadImage).not.toHaveBeenCalled();
      expect(ctx.image.getBufferFromUrl).not.toHaveBeenCalled();
    },
  );

  it('checks and uploads the same complete filename, then reuses it on a repeated transform', async () => {
    const ctx = createContext();
    const originalUrl = 'https://img.test/a.b.png?size=1';
    const cleanUrl = 'https://img.test/a.b.png';
    ctx.image.getUrlListFromContent.mockReturnValue([{ originalUrl, data: cleanUrl, type: 'url' }]);
    const helper = new ElogImageContext(ctx, {});
    const uploaded = new Map<string, string>();
    const uploader = createUploader();
    uploader.hasImage.mockImplementation(async (fileName) => uploaded.get(fileName));
    uploader.uploadImage.mockImplementation(async (fileName) => {
      const url = `https://cdn.test/${fileName}`;
      uploaded.set(fileName, url);
      return url;
    });
    const firstDoc = { ...createDoc(), body: `![pixel](${originalUrl})` };

    await helper.replaceImages([firstDoc], uploader);

    expect(uploader.hasImage).toHaveBeenCalledExactlyOnceWith('stable-image.png');
    expect(uploader.uploadImage).toHaveBeenCalledExactlyOnceWith(
      'stable-image.png',
      imageBuffer,
      firstDoc,
    );
    expect(firstDoc.body).toBe(`![pixel](${uploadedUrl})`);
    expect(ctx.image.genUniqueIdFromUrl).toHaveBeenCalledWith(cleanUrl);
    expect(ctx.image.getBufferFromUrl).toHaveBeenCalledExactlyOnceWith(originalUrl);

    const secondDoc = { ...createDoc(), body: `![pixel](${originalUrl})` };
    await helper.replaceImages([secondDoc], uploader);

    expect(uploader.hasImage).toHaveBeenCalledTimes(2);
    expect(uploader.hasImage).toHaveBeenNthCalledWith(2, 'stable-image.png');
    expect(uploader.uploadImage).toHaveBeenCalledTimes(1);
    expect(ctx.image.getBufferFromUrl).toHaveBeenCalledTimes(1);
    expect(secondDoc.body).toBe(`![pixel](${uploadedUrl})`);
  });
});
