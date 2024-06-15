import type { IPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import { ImageGithubConfig } from './types';

export default function imageLocal(options: Partial<ImageGithubConfig>): IPlugin {
  return {
    name: 'image-github',
    transform(docs) {
      const imageLocal = new ImageClient(options as ImageGithubConfig, this);
      return imageLocal.processImages(docs);
    },
  };
}
