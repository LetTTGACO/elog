import type { IPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import { ImageUPYunConfig } from './types';

export default function imageLocal(options: Partial<ImageUPYunConfig>): IPlugin {
  return {
    name: 'image-upyun',
    transform(docs) {
      const imageLocal = new ImageClient(options as ImageUPYunConfig, this);
      return imageLocal.processImages(docs);
    },
  };
}
