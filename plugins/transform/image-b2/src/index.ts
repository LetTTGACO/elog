import type { TransformPlugin } from '@elog/cli';
import ImageClient from './ImageClient';
import type { ImageB2Config } from './types';

export default function imageB2(options: Partial<ImageB2Config>): TransformPlugin {
  return {
    name: 'transform:image-b2',
    kind: 'transform',
    transform(docs, ctx) {
      const imageB2 = new ImageClient(options as ImageB2Config, ctx);
      return imageB2.processImages(docs);
    },
  };
}
