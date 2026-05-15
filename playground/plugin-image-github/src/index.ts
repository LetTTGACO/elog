import type { TransformPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import type { ImageGithubConfig } from './types';

export default function imageGithub(options: Partial<ImageGithubConfig>): TransformPlugin {
  return {
    name: 'transform:image-github',
    kind: 'transform',
    transform(docs, ctx) {
      const imageGithub = new ImageClient(options as ImageGithubConfig, ctx);
      return imageGithub.processImages(docs);
    },
  };
}
