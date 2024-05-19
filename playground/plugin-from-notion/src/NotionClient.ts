import { NotionConfig, NotionDoc } from './types';
import { DocDetail, ElogFromContext, PluginContext } from '@elogx-test/elog';
import NotionApi from './NotionApi';

export default class NotionClient extends ElogFromContext {
  private readonly config: NotionConfig;
  private readonly api: NotionApi;

  constructor(config: NotionConfig, ctx: PluginContext) {
    super(ctx, config);
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
    this.ctx.info('正在获取文档列表，请稍等...');
    // 获取待发布的文章
    const notionBaseDocList = await this.api.getDocList();
    const { docList: needUpdateDocList, idMap } = this.filterDocs(
      notionBaseDocList,
      'id',
      'last_edited_time',
    );
    // 没有则不需要更新
    if (!needUpdateDocList.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }
    this.ctx.info('待下载数', String(needUpdateDocList.length));
    let docDetailList: DocDetail[];
    const promise = async (doc: NotionDoc) => {
      this.ctx.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.properties.title);
      let article = await this.api.getDocDetail(doc);
      const docDetail: DocDetail = {
        id: doc.id,
        title: doc.properties.title,
        body: article.body,
        properties: article.properties,
        updateTime: new Date(doc.last_edited_time).getTime(),
        docStructure: doc.docStructure,
      };
      return docDetail;
    };
    docDetailList = await this.asyncPool(this.config.limit || 3, needUpdateDocList, promise);
    // 更新缓存
    this.updateCache(docDetailList, idMap);
    this.ctx.info('已下载数', String(needUpdateDocList.length));
    // 写入缓存
    this.writeCache({
      sortedDocList: notionBaseDocList.map((item) => ({
        id: item.id,
        title: item.properties.title,
      })),
    });
    return docDetailList;
  }
}
