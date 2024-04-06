import type { IPlugin } from '@elogx-test/elog';
import ImageLocal from './ImageLocal';
import type { ImageLocalConfig } from './types';

export default function imageLocal(options: Partial<ImageLocalConfig>): IPlugin {
  return {
    name: 'image-local',
    config() {
      return {
        outputDir: './images',
        pathFollowDoc: { enable: true, docOutputDir: './docs' },
      };
    },
    transform(docs) {
      const imageLocal = new ImageLocal(options as ImageLocalConfig, this);
      return imageLocal.replaceImages(docs);
    },
  };
}
