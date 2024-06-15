import type { IPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import { ImageOSSConfig } from './types';

export default function imageLocal(options: Partial<ImageOSSConfig>): IPlugin {
  return {
    name: 'image-oss',
    transform(docs) {
      const imageLocal = new ImageClient(options as ImageOSSConfig, this);
      return imageLocal.processImages(docs);
    },
  };
}
