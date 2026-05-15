import { afterEach, describe, expect, it, vi } from 'vitest';
import out from './logger';

const exitMock = vi.hoisted(() =>
  vi.fn((code?: string | number | null) => {
    throw new Error(`process.exit ${code}`);
  }),
);

vi.mock('process', () => ({
  env: {},
  exit: exitMock,
  stdout: { columns: 120 },
}));

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    exitMock.mockClear();
  });

  it('exits with a nonzero code for fatal errors', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => out.error('boom')).toThrow('process.exit 1');
    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
