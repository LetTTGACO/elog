import { FeiShuConfig } from './types';
import { ElogFromContext, PluginContext } from '@elogx-test/elog';
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
  async getDocDetailList() {
    return this.docDetailList({
      getSortedDocList: this.api.getSortedDocList,
      getDocDetail: this.api.getDocDetail,
      limit: this.config.limit,
    });
  }
}
