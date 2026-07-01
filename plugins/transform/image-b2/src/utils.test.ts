import { describe, expect, it } from 'vitest';
import { publicUrl } from './utils';

describe('publicUrl', () => {
  it('builds public urls from hosts with or without protocol', () => {
    expect(publicUrl('cdn.example.com/', 'elog/a.png')).toBe('https://cdn.example.com/elog/a.png');
    expect(publicUrl('http://cdn.example.com', 'elog/a.png')).toBe(
      'http://cdn.example.com/elog/a.png',
    );
  });
});
