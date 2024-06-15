import { NotionConfig, NotionDoc } from './types';
import { ElogFromContext, PluginContext } from '@elogx-test/elog';
import NotionApi from './NotionApi';

export default class NotionClient extends ElogFromContext {
  private readonly config: NotionConfig;
  private readonly api: NotionApi;

  constructor(config: NotionConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.api = new NotionApi(config, ctx);
    this.initCatalogConfig();
  }

  /**
   * 初始化目录配置
   */
  initCatalogConfig() {
    if (typeof this.config.catalog === 'boolean') {
      if (!this.config.catalog) {
        // 不启用目录
        this.config.catalog = { enable: false };
      } else {
        // 启用目录
        this.ctx.success('开启分类', '默认按照 catalog 字段分类，请检查Notion数据库是否存在该属性');
        this.config.catalog = { enable: true, property: 'catalog' };
      }
    } else if (typeof this.config.catalog === 'object') {
      if (this.config.catalog.enable) {
        // 检查分类字段是否存在
        if (!this.config.catalog.property) {
          this.config.catalog.property = 'catalog';
          this.ctx.warn(
            '未设置分类字段，默认按照 catalog 字段分类，请检查Notion数据库是否存在该属性',
          );
        }
      }
    }
  }
  /**
   * 获取文章列表
   */
  async getDocDetailList() {
    this.ctx.info('正在获取待更新文档，请稍等...');
    // 获取待发布的文章
    const sortedDocList = await this.api.getSortedDocList();
    // 过滤不需要更新的文档
    const { docList: needUpdateDocList, docStatusMap } = this.filterDocs(sortedDocList);
    // 没有则不需要更新
    if (!needUpdateDocList.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }
    this.ctx.info('待下载数', String(needUpdateDocList.length));
    const promise = async (doc: NotionDoc) => {
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
