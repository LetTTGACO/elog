import { DocDetail, ElogImageContext, PluginContext } from '@elogx-test/elog';
import { ImageUPYunConfig } from './types';
import UPYunApi from './ImageApi';

export default class ImageClient extends ElogImageContext {
  private readonly api: UPYunApi;

  constructor(config: ImageUPYunConfig, ctx: PluginContext) {
    super(ctx, config);
    this.api = new UPYunApi(config, ctx);
  }

  /**
   * 处理图片
   * @param docDetailList
   */
  async processImages(docDetailList: DocDetail[]) {
    return this.replaceImages(docDetailList, this.api);
  }
}
