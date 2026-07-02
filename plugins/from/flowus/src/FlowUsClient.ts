import { FlowUsConfig } from './types';
import { DownloadResult, ElogFromContext, PluginContext } from '@elog/cli';
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
  async getDocDetailList(): Promise<DownloadResult> {
    return this.docDetailList({
      getSortedDocList: () => this.api.getSortedDocList(),
      getDocDetail: (doc) => this.api.getDocDetail(doc),
      limit: this.config.limit,
    });
  }
}
