import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from '../http/request';
import { getFileType, getFileTypeFromUrl, getImageDataUrl, getUrlListFromContent } from './index';

vi.mock('../http/request', () => ({ default: vi.fn() }));

const pngPayload =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH2kAAAAASUVORK5CYII=';
const pngBuffer = Buffer.from(pngPayload, 'base64');
const dataUrl = `data:image/png;base64,${pngPayload}`;

beforeEach(() => {
  vi.mocked(request).mockReset();
});

describe('image data URLs', () => {
  it('decodes only the payload and detects the type without downloading', async () => {
    expect(getImageDataUrl(dataUrl)).toEqual({
      type: 'png',
      payload: pngPayload,
      buffer: pngBuffer,
    });
    await expect(getFileType(dataUrl)).resolves.toEqual({ type: 'png' });
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'empty payload', payload: '' },
    { label: 'invalid characters', payload: '%%%invalid%%%' },
    { label: 'incomplete byte', payload: 'A' },
    { label: 'non-round-trippable payload', payload: 'AB==' },
  ])('rejects $label without downloading', async ({ payload }) => {
    const invalidUrl = `data:image/png;base64,${payload}`;

    expect(getImageDataUrl(invalidUrl)).toBeUndefined();
    await expect(getFileType(invalidUrl)).resolves.toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  });

  it('preserves the complete data URL when extracting a Markdown image', () => {
    expect(getUrlListFromContent(`Before ![pixel](${dataUrl}) after`)).toEqual([
      { originalUrl: dataUrl, data: dataUrl, type: 'base64' },
    ]);
  });
});

describe('image file types', () => {
  it.each(['', '?size=1.2', '#preview.jpg', '?size=1.2#preview.jpg'])(
    'uses the final extension and preserves the multipart basename with suffix "%s"',
    async (suffix) => {
      const url = `https://img.test/a.b.png${suffix}`;

      expect(getFileTypeFromUrl(url)).toEqual({ name: 'a.b', type: 'png' });
      await expect(getFileType(url)).resolves.toEqual({ name: 'a.b', type: 'png' });
      expect(request).not.toHaveBeenCalled();
    },
  );

  it('falls back to the downloaded image bytes when the URL has no extension', async () => {
    const url = 'https://img.test/image?download=1#preview';
    vi.mocked(request).mockResolvedValue({ status: 200, headers: {}, data: pngBuffer });

    await expect(getFileType(url)).resolves.toEqual({ type: 'png' });
    expect(request).toHaveBeenCalledExactlyOnceWith(url, { dataType: 'buffer' });
  });
});
