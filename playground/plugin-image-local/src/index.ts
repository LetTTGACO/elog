import type { IPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import type { ImageLocalConfig } from './types';

export default function imageLocal(options: Partial<ImageLocalConfig>): IPlugin {
  return {
    name: 'image-local',
    transform(docs) {
      const imageLocal = new ImageClient(options as ImageLocalConfig, this);
      return imageLocal.replaceImages(docs);
    },
  };
}
