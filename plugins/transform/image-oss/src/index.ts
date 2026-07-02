import type { TransformPlugin } from '@elog/cli';
import ImageClient from './ImageClient';
import type { ImageOSSConfig } from './types';

export default function imageOss(options: Partial<ImageOSSConfig>): TransformPlugin {
  return {
    name: 'transform:image-oss',
    kind: 'transform',
    transform(docs, ctx) {
      const imageOss = new ImageClient(options as ImageOSSConfig, ctx);
      return imageOss.processImages(docs);
    },
  };
}
