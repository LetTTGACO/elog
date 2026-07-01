import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBufferFromUrl } from './index';

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
