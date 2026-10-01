import { DocDetail, ElogImageContext, PluginContext } from '@elog/plugin-sdk';
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
    // 每次上传都会写入仓库提交，串行执行以避免分支更新冲突。
    return this.replaceImages(docDetailList, this.api, 1);
  }
}
