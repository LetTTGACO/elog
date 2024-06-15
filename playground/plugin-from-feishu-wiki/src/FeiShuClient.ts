import { FeiShuConfig, FeiShuDoc } from './types';
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
    this.ctx.info('正在获取文档列表，请稍等...');
    // 获取已排序的文档
    const sortedDocList = await this.api.getSortedDocList();
    // 过滤不需要更新的文档
    const { docList: needUpdateDocList, docStatusMap } = this.filterDocs(sortedDocList);
    // 没有则不需要更新
    if (!needUpdateDocList.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }
    this.ctx.info('待下载数', String(needUpdateDocList.length));
    const promise = async (doc: FeiShuDoc) => {
      this.ctx.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.title);
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
