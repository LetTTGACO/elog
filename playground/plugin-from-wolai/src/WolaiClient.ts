import { ElogFromContext, PluginContext } from '@elogx-test/elog';
import WolaiApi from './WolaiApi';
import { WoLaiConfig, WoLaiDoc } from './types';

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
  async getDocDetailList() {
    this.ctx.info('正在获取待更新文档，请稍等...');
    // 获取已排序的文档
    const sortedDocList = await this.api.getSortedDocList();
    const { docList: needUpdateDocList, docStatusMap } = this.filterDocs(sortedDocList);
    // 没有则不需要更新
    if (!needUpdateDocList.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }
    this.ctx.info('待下载数', String(needUpdateDocList.length));

    const promise = async (doc: WoLaiDoc) => {
      this.ctx.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.properties.title);
      return this.api.getDocDetail(doc);
    };
    const docDetailList = await this.asyncPool(this.config.limit || 3, needUpdateDocList, promise);
    this.ctx.info('已下载数', String(needUpdateDocList.length));
    return {
      docDetailList,
      sortedDocList,
      docStatusMap,
    };
  }
}
