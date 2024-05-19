import { FlowUsConfig, FlowUsDoc } from './types';
import { ElogFromContext, PluginContext } from '@elogx-test/elog';
import FlowUsApi from './FlowUsApi';

export default class FlowUsClient extends ElogFromContext {
  config: FlowUsConfig;
  api: FlowUsApi;

  constructor(config: FlowUsConfig, ctx: PluginContext) {
    super(ctx, config);
    this.config = config;
    this.api = new FlowUsApi(config, ctx);
  }

  /**
   * 获取文章列表
   */
  async getDocDetailList() {
    this.ctx.info('正在获取文档列表，请稍等...');
    // 获取已排序的文档
    const sortedDocList = await this.api.getSortedDocList();
    const { docList: needUpdateDocList, idMap } = this.filterDocs(sortedDocList, 'id', 'updated');
    // 没有则不需要更新
    if (!needUpdateDocList.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }
    this.ctx.info('待下载数', String(needUpdateDocList.length));

    const promise = async (doc: FlowUsDoc) => {
      this.ctx.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.title);
      return this.api.getDocDetail(doc);
    };
    const docDetailList = await this.asyncPool(this.config.limit || 3, needUpdateDocList, promise);
    // 更新缓存
    this.updateCache(docDetailList, idMap);
    this.ctx.info('已下载数', String(needUpdateDocList.length));
    // 写入缓存
    this.writeCache({
      sortedDocList: sortedDocList.map((item) => ({
        id: item.id,
        title: item.properties.title,
      })),
    });
    return docDetailList;
  }
}
