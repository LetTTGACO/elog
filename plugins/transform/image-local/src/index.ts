import type { TransformPlugin } from '@elog/cli';
import ImageClient from './ImageClient';
import type { ImageLocalConfig } from './types';

export default function imageLocal(options: Partial<ImageLocalConfig>): TransformPlugin {
  return {
    name: 'transform:image-local',
    kind: 'transform',
    transform(docs, ctx) {
      const imageLocal = new ImageClient(options as ImageLocalConfig, ctx);
      return imageLocal.processImages(docs);
    },
  };
}
