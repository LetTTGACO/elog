import { DocDetail, ElogImageContext, PluginContext } from '@elogx-test/elog';
import { ImageGithubConfig } from './types';
import COSApi from './ImageApi';

export default class ImageClient extends ElogImageContext {
  private readonly api: COSApi;

  constructor(config: ImageGithubConfig, ctx: PluginContext) {
    super(ctx, config);
    this.api = new COSApi(config, ctx);
  }

  /**
   * 处理图片
   * @param docDetailList
   */
  async processImages(docDetailList: DocDetail[]) {
    return this.replaceImages(docDetailList, this.api);
  }
}
