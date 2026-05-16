import { FlowUsConfig } from './types';
import { ElogFromContext, PluginContext } from '@elogx-test/elog';
import FlowUsApi from './FlowUsApi';

export default class FlowUsClient extends ElogFromContext {
  config: FlowUsConfig;
  api: FlowUsApi;

  constructor(config: FlowUsConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.api = new FlowUsApi(config, ctx);
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
