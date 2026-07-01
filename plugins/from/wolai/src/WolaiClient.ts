import { DownloadResult, ElogFromContext, PluginContext } from '@elogx-test/elog';
import WolaiApi from './WolaiApi';
import { WoLaiConfig } from './types';

export default class WolaiClient extends ElogFromContext {
  config: WoLaiConfig;
  api: WolaiApi;

  constructor(config: WoLaiConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.api = new WolaiApi(config, ctx);
  }

  /**
   * 获取文章列表
   */
  async getDocDetailList(): Promise<DownloadResult> {
    return this.docDetailList({
      getSortedDocList: () => this.api.getSortedDocList(),
      getDocDetail: (doc) => this.api.getDocDetail(doc),
      limit: this.config.limit,
    });
  }
}
