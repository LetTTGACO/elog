import type { IPlugin } from '@elogx-test/elog';
import ImageLocal from './ImageLocal';
import type { ImageLocalConfig } from './types';

export default function imageLocal(options: ImageLocalConfig): IPlugin {
  return {
    name: 'image-local',
    transform(docs) {
      const imageLocal = new ImageLocal(options, this);
      return imageLocal.replaceImages(docs);
    },
  };
}
