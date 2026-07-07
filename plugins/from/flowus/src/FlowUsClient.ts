import { FlowUsConfig } from './types';
import { ElogFromContext, type DownloadResult, type PluginContext } from '@elog/plugin-sdk';
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
