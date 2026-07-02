import { DocDetail, ElogImageContext, PluginContext } from '@elog/cli';
import { ImageGithubConfig } from './types';
import GithubApi from './ImageApi';

export default class ImageClient extends ElogImageContext {
  private readonly api: GithubApi;

  constructor(config: ImageGithubConfig, ctx: PluginContext) {
    super(ctx, config);
    this.api = new GithubApi(config, ctx);
  }

  /**
   * 处理图片
   * @param docDetailList
   */
  async processImages(docDetailList: DocDetail[]) {
    return this.replaceImages(docDetailList, this.api, 3);
  }
}
