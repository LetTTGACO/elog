import type { TransformPlugin } from '@elog/plugin-sdk';
import ImageClient from './ImageClient';
import type { ImageUPYunConfig } from './types';

export default function imageUpyun(options: Partial<ImageUPYunConfig>): TransformPlugin {
  return {
    name: 'transform:image-upyun',
    kind: 'transform',
    transform(docs, ctx) {
      const imageUpyun = new ImageClient(options as ImageUPYunConfig, ctx);
      return imageUpyun.processImages(docs);
    },
  };
}
