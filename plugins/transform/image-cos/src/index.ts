import type { TransformPlugin } from '@elogx-test/elog';
import ImageClient from './ImageClient';
import type { ImageCOSConfig } from './types';

export default function imageCos(options: Partial<ImageCOSConfig>): TransformPlugin {
  return {
    name: 'transform:image-cos',
    kind: 'transform',
    transform(docs, ctx) {
      const imageCos = new ImageClient(options as ImageCOSConfig, ctx);
      return imageCos.processImages(docs);
    },
  };
}
