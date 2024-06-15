import { PluginContext } from '../../types/plugin';
import { DocDetail, ImageBaseConfig } from '../../types/doc';

import { ElogBaseContext } from './BaseContext';
import { ImageUploader } from '../../types/image';

/**
 * 适用于 From 写作平台的 Elog 工具类
 */
export class ElogImageContext extends ElogBaseContext {
  // private readonly baseConfig: ImageBaseConfig;
  // private readonly uploader: ImageUploader;
  constructor(ctx: PluginContext, baseConfig: ImageBaseConfig, uploader: ImageUploader) {
    super(ctx);
    // this.baseConfig = baseConfig;
  }

  replaceImages(docList: DocDetail[]) {}
}
