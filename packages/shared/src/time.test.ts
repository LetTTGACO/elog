import { afterEach, describe, expect, it } from 'vitest';
import { formatTime } from './time';

describe('formatTime', () => {
  afterEach(() => {
    delete process.env.TIME_ZONE;
  });

  it('formats time in Asia/Shanghai by default', () => {
    expect(formatTime('2026-06-30T22:56:00.000Z')).toBe('2026-07-01 06:56:00');
  });

  it('formats time with process.env.TIME_ZONE when set', () => {
    process.env.TIME_ZONE = 'UTC';

    expect(formatTime('2026-06-30T22:56:00.000Z')).toBe('2026-06-30 22:56:00');
  });
});
