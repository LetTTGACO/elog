import type { TransformPlugin } from '@elog/plugin-sdk';
import ImageClient from './ImageClient';
import type { ImageR2Config } from './types';

export default function imageR2(options: Partial<ImageR2Config>): TransformPlugin {
  return {
    name: 'transform:image-r2',
    kind: 'transform',
    transform(docs, ctx) {
      const imageR2 = new ImageClient(options as ImageR2Config, ctx);
      return imageR2.processImages(docs);
    },
  };
}
