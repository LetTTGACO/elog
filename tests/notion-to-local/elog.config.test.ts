import { describe, expect, it } from 'vitest';
import config from './elog.config';

describe('notion-to-local config', () => {
  it('uses image-local for body images and cover property images', () => {
    expect(config.plugins?.map((plugin) => plugin.name)).toEqual(['transform:image-local']);
  });
});
