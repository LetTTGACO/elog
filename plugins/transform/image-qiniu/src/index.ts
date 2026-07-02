import type { TransformPlugin } from '@elog/cli';
import ImageClient from './ImageClient';
import type { ImageQiniuConfig } from './types';

export default function imageQiniu(options: Partial<ImageQiniuConfig>): TransformPlugin {
  return {
    name: 'transform:image-qiniu',
    kind: 'transform',
    transform(docs, ctx) {
      const imageQiniu = new ImageClient(options as ImageQiniuConfig, ctx);
      return imageQiniu.processImages(docs);
    },
  };
}
