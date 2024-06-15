import { PluginContext } from '../../types/plugin';
import { DocDetail } from '../../types/doc';

import { ElogBaseContext } from './BaseContext';
import { ImageBaseConfig, ImageUploader } from '../../types/image';
import { replaceImagesFunc } from '../doc/image';

/**
 * 适用于图片替换工具类
 */
export class ElogImageContext extends ElogBaseContext {
  private readonly imageBaseConfig: ImageBaseConfig;
  constructor(ctx: PluginContext, imageBaseConfig: ImageBaseConfig) {
    super(ctx);
    this.imageBaseConfig = imageBaseConfig;
  }

  /**
   * 替换图片
   * @param docDetailList
   * @param uploader
   * @param limit
   */
  async replaceImages(docDetailList: DocDetail[], uploader: ImageUploader, limit?: number) {
    if (this.imageBaseConfig.disable) {
      this.ctx.info('图片替换已禁用');
      return docDetailList;
    }
    return replaceImagesFunc(docDetailList, uploader, limit || this.imageBaseConfig.limit || 10);
  }
}
