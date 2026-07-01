import { FeiShuConfig } from './types';
import { DownloadResult, ElogFromContext, PluginContext } from '@elogx-test/elog';
import FeiShuApi from './FeiShuApi';

export default class FeiShuClient extends ElogFromContext {
  config: FeiShuConfig;
  api: FeiShuApi;

  constructor(config: FeiShuConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.api = new FeiShuApi(config, ctx);
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
