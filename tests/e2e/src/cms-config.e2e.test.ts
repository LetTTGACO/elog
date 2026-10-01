import type { ElogConfig } from '@elog/core';
import { describe, expect, it } from 'vitest';
import haloConfig from '../cases/notion-to-halo/elog.config';
import wordpressConfig from '../cases/notion-to-wordpress/elog.config';

describe('CMS e2e configs', () => {
  it.each([
    { target: 'Halo', name: 'to:halo', config: haloConfig },
    { target: 'WordPress', name: 'to:wordpress', config: wordpressConfig },
  ])('keeps R2 global and Markdown to HTML scoped to $target', ({ config, name }) => {
    expect(Array.isArray(config)).toBe(false);
    const singleConfig = config as ElogConfig;

    expect((singleConfig.plugins ?? []).map((plugin) => plugin.name)).toEqual([
      'transform:image-r2',
    ]);
    expect(singleConfig.to).toMatchObject({
      name,
      plugins: [{ name: 'transform:markdown-to-html', kind: 'transform' }],
    });
  });
});
