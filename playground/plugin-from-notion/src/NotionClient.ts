import { NotionConfig } from './types';
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
    return this.docDetailList({
      getSortedDocList: this.api.getSortedDocList,
      getDocDetail: this.api.getDocDetail,
      limit: this.config.limit,
    });
  }
}
