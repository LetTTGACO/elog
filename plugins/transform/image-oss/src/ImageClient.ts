import { DocDetail, ElogImageContext, PluginContext } from '@elogx-test/elog';
import { ImageOSSConfig } from './types';
import OSSApi from './ImageApi';

export default class ImageClient extends ElogImageContext {
  private readonly api: OSSApi;

  constructor(config: ImageOSSConfig, ctx: PluginContext) {
    super(ctx, config);
    this.api = new OSSApi(config, ctx);
  }

  /**
   * 处理图片
   * @param docDetailList
   */
  async processImages(docDetailList: DocDetail[]) {
    return this.replaceImages(docDetailList, this.api);
  }
}
