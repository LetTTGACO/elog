import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatImagePrefix,
  genUniqueIdFromUrl,
  getBufferFromUrl,
  getFileType,
  getFileTypeFromUrl,
  getUrlListFromContent,
} from './index';

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

  it('sends the FlowUs referer only for FlowUs image hosts', async () => {
    requestMock.mockResolvedValue({ data: Buffer.from('image') });

    await getBufferFromUrl('https://static.flowus.cn/image.png');
    await getBufferFromUrl('https://example.com/image.png');

    expect(requestMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: { referer: 'https://flowus.cn/' },
      }),
    );
    expect(requestMock.mock.calls[1][1]).not.toHaveProperty('headers');
  });
});

describe('getFileTypeFromUrl', () => {
  it('uses the final extension after query and hash data', () => {
    expect(getFileTypeFromUrl('https://example.com/path/a.b.png?token=1#preview')).toEqual({
      name: 'a.b',
      type: 'png',
    });
  });
});

describe('getFileType', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('falls back to detecting extensionless URLs from the downloaded buffer', async () => {
    requestMock.mockResolvedValue({
      data: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p94AAAAASUVORK5CYII=',
        'base64',
      ),
    });

    await expect(getFileType('https://example.com/image')).resolves.toEqual({ type: 'png' });
  });
});

describe('formatImagePrefix', () => {
  it('formats object storage prefixes with no leading slash and one trailing slash', () => {
    expect(formatImagePrefix()).toBe('');
    expect(formatImagePrefix('/elog/images//')).toBe('elog/images/');
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
