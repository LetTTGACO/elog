import type { IPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import { ImageQiniuConfig } from './types';

export default function imageLocal(options: Partial<ImageQiniuConfig>): IPlugin {
  return {
    name: 'image-qiniu',
    transform(docs) {
      const imageLocal = new ImageClient(options as ImageQiniuConfig, this);
      return imageLocal.processImages(docs);
    },
  };
}
