import { beforeEach, describe, expect, it, vi } from 'vitest';
import { genUniqueIdFromUrl, getBufferFromUrl, getUrlListFromContent } from './index';

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

describe('getBufferFromUrl', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('requests image data as a buffer', async () => {
    const data = Buffer.from('image');
    requestMock.mockResolvedValue({ data });

    await expect(getBufferFromUrl('https://example.com/image')).resolves.toEqual(data);

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/image',
      expect.objectContaining({ dataType: 'buffer' }),
    );
  });
});

describe('getUrlListFromContent', () => {
  it('keeps Notion signed image URLs for download and cleans them for stable naming', () => {
    const markdown =
      '![diagram](https://prod-files-secure.s3.us-west-2.amazonaws.com/space/page/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc#preview)';

    const urls = getUrlListFromContent(markdown);

    expect(urls).toEqual([
      {
        originalUrl:
          'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/page/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc#preview',
        data: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/page/image.png',
        type: 'url',
      },
    ]);
    expect(genUniqueIdFromUrl(urls[0].data)).toBe(
      genUniqueIdFromUrl(
        'https://prod-files-secure.s3.us-west-2.amazonaws.com/space/page/image.png',
      ),
    );
  });
});
