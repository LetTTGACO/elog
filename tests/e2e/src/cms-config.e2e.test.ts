import type { ElogConfig } from '@elog/cli';
import { describe, expect, it } from 'vitest';
import haloConfig, {
  createNotionToHaloConfig,
  e2eProfile as haloProfile,
} from '../cases/notion-to-halo/elog.config';
import wordpressConfig, {
  createNotionToWordPressConfig,
  e2eProfile as wordpressProfile,
} from '../cases/notion-to-wordpress/elog.config';

function transformNames(config: ElogConfig): string[] {
  return (config.plugins ?? []).map((plugin) => plugin.name);
}

describe('CMS e2e configs', () => {
  it('runs Markdown to HTML before the Halo target with the default profile', () => {
    expect(transformNames(haloConfig)).toEqual(['transform:markdown-to-html']);
  });

  it('runs optional Halo image transforms before Markdown to HTML', () => {
    expect(
      transformNames(
        createNotionToHaloConfig({
          ...haloProfile,
          image: {
            kind: 'local',
            outputDir: 'images',
            prefixKey: '/images/',
          },
        }),
      ),
    ).toEqual(['transform:image-local', 'transform:markdown-to-html']);

    expect(
      transformNames(
        createNotionToHaloConfig({
          ...haloProfile,
          image: {
            kind: 'r2',
          },
        }),
      ),
    ).toEqual(['transform:image-r2', 'transform:markdown-to-html']);
  });

  it('runs Markdown to HTML before the WordPress target with the default profile', () => {
    expect(transformNames(wordpressConfig)).toEqual(['transform:markdown-to-html']);
  });

  it('runs optional WordPress image transforms before Markdown to HTML', () => {
    expect(
      transformNames(
        createNotionToWordPressConfig({
          ...wordpressProfile,
          image: {
            kind: 'local',
            outputDir: 'images',
            prefixKey: '/images/',
          },
        }),
      ),
    ).toEqual(['transform:image-local', 'transform:markdown-to-html']);

    expect(
      transformNames(
        createNotionToWordPressConfig({
          ...wordpressProfile,
          image: {
            kind: 'r2',
          },
        }),
      ),
    ).toEqual(['transform:image-r2', 'transform:markdown-to-html']);
  });
});
