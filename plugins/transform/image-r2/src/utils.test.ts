import { describe, expect, it } from 'vitest';
import { formattedPrefix, publicUrl } from './utils';

describe('formattedPrefix', () => {
  it('keeps empty prefixes at the bucket root', () => {
    expect(formattedPrefix()).toBe('');
  });

  it('normalizes prefixes to no leading slash and one trailing slash', () => {
    expect(formattedPrefix('/elog/images')).toBe('elog/images/');
  });

  it('builds public urls from hosts with or without protocol', () => {
    expect(publicUrl('cdn.example.com/', 'elog/a.png')).toBe('https://cdn.example.com/elog/a.png');
    expect(publicUrl('http://cdn.example.com', 'elog/a.png')).toBe(
      'http://cdn.example.com/elog/a.png',
    );
  });
});
