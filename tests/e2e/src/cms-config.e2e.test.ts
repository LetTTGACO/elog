import type { ElogConfig } from '@elog/core';
import { describe, expect, it } from 'vitest';
import haloConfig from '../cases/notion-to-halo/elog.config';
import wordpressConfig from '../cases/notion-to-wordpress/elog.config';

function transformNames(config: ElogConfig | ElogConfig[]): string[] {
  expect(Array.isArray(config)).toBe(false);
  const singleConfig = config as ElogConfig;
  return (singleConfig.plugins ?? []).map((plugin) => plugin.name);
}

describe('CMS e2e configs', () => {
  it('runs R2 before Markdown to HTML before the Halo target with the default profile', () => {
    expect(transformNames(haloConfig)).toEqual([
      'transform:image-r2',
      'transform:markdown-to-html',
    ]);
  });

  it('runs R2 before Markdown to HTML before the WordPress target with the default profile', () => {
    expect(transformNames(wordpressConfig)).toEqual([
      'transform:image-r2',
      'transform:markdown-to-html',
    ]);
  });
});
