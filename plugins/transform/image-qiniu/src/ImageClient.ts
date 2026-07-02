import { DocDetail, ElogImageContext, PluginContext } from '@elog/cli';
import { ImageQiniuConfig } from './types';
import QiniuApi from './ImageApi';

export default class ImageClient extends ElogImageContext {
  private readonly api: QiniuApi;

  constructor(config: ImageQiniuConfig, ctx: PluginContext) {
    super(ctx, config);
    this.api = new QiniuApi(config, ctx);
  }

  /**
   * 处理图片
   * @param docDetailList
   */
  async processImages(docDetailList: DocDetail[]) {
    return this.replaceImages(docDetailList, this.api);
  }
}
