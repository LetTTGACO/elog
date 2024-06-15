import type { IPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import { ImageCOSConfig } from './types';

export default function imageLocal(options: Partial<ImageCOSConfig>): IPlugin {
  return {
    name: 'image-cos',
    transform(docs) {
      const imageLocal = new ImageClient(options as ImageCOSConfig, this);
      return imageLocal.processImages(docs);
    },
  };
}
