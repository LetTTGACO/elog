import type { PluginContext } from '../types';
import { DocDetail } from '../../types/doc';

import { ElogBaseContext } from './BaseContext';
import { ImageBaseConfig, ImageUploader } from '../../types/image';
import { replaceImagesFunc } from '../../image/replace';

/**
 * 适用于图片替换工具类，负责把插件配置转换为共享图片替换流程参数。
 */
export class ElogImageContext extends ElogBaseContext {
  private readonly imageBaseConfig: ImageBaseConfig;
  constructor(ctx: PluginContext, imageBaseConfig: ImageBaseConfig) {
    super(ctx);
    this.imageBaseConfig = imageBaseConfig;
  }

  /**
   * 替换图片，禁用时直接返回原文档列表以保持 transform 管线连续。
   * @param docDetailList
   * @param uploader
   * @param limit
   */
  async replaceImages(docDetailList: DocDetail[], uploader: ImageUploader, limit?: number) {
    if (this.imageBaseConfig.disable) {
      this.ctx.logger.info('图片替换已禁用');
      return docDetailList;
    }
    return replaceImagesFunc(docDetailList, uploader, limit || this.imageBaseConfig.limit || 10);
  }
}
