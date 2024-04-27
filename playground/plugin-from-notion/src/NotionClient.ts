import Context from './Context';
import { DocStatus, DocStatusMap, NotionConfig, NotionDoc } from './types';
import { DocDetail, DocStructure, PluginContext } from '@elogx-test/elog';
import NotionApi from './NotionApi';
import { asyncPoolAll } from './utils';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default class NotionClient extends Context {
  private readonly config: NotionConfig;
  private readonly api: NotionApi;
  private cachedDocList: DocDetail[] = [];

  constructor(config: NotionConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.api = new NotionApi(config, ctx);
    this.initCatalogConfig();
    this.initIncrementalUpdate();
  }

  /**
   * 初始化增量配置
   */
  initIncrementalUpdate() {
    if (this.config.disableCache) {
      this.ctx.success('全量更新', '已禁用缓存，将全量更新文档');
      return;
    }
    try {
      const cacheJson = require(path.join(process.cwd(), this.config.cacheFilePath!));
      const { docs } = cacheJson;
      // 获取缓存文章
      this.cachedDocList = docs as DocDetail[];
    } catch (error) {
      this.ctx.success('全量更新', '未获取到缓存，将全量更新文档');
    }
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
    // 过滤掉被删除的文章
    this.cachedDocList = this.cachedDocList.filter((cache) => {
      return notionBaseDocList.findIndex((item) => item.id === cache.id) !== -1;
    });
    let needUpdateDocList: NotionDoc[] = [];
    let idMap: DocStatusMap = {};
    for (const article of notionBaseDocList) {
      // 判断哪些文章是新增的
      const cacheIndex = this.cachedDocList.findIndex((cacheItem) => cacheItem.id === article.id);
      // 新增的则加入需要下载的ids列表
      if (cacheIndex < 0) {
        needUpdateDocList.push({ ...article, _index: needUpdateDocList.length + 1 });
        // 记录被更新文章状态
        idMap[article.id] = {
          updateIndex: -1,
          status: DocStatus.create,
        };
      } else {
        // 不是新增的则判断是否文章更新了
        const cacheDoc = this.cachedDocList[cacheIndex];
        let needUpdate = new Date(article.last_edited_time).getTime() !== cacheDoc.updateTime;
        if (cacheDoc.error === 1) {
          this.ctx.warn(
            `上次同步时【${cacheDoc.properties.title}】存在图片下载失败，本次将尝试重新同步。如果并不需要当前文档参与本次同步，请在缓存文件（默认为 elog.cache.json）中找到词文档并删除 error 字段`,
          );
          needUpdate = true;
        }
        if (needUpdate) {
          // 如果文章更新了则加入需要下载的ids列表, 没有更新则不需要下载
          needUpdateDocList.push({ ...article, _index: needUpdateDocList.length + 1 });
          // 记录被更新文章状态和索引
          idMap[article.id] = {
            updateIndex: cacheIndex,
            status: DocStatus.update,
          };
        }
      }
    }
    // 没有则不需要更新
    if (!needUpdateDocList.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }

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
    docDetailList = await asyncPoolAll(this.config.limit || 3, needUpdateDocList, promise);
    // 更新缓存里的文章
    for (const docDetail of docDetailList) {
      const { updateIndex, status } = idMap[docDetail.id];
      if (status === DocStatus.create) {
        // 新增文档
        this.cachedDocList.push(docDetail);
      } else {
        // 更新文档
        this.cachedDocList[updateIndex] = docDetail;
      }
    }
    this.ctx.info('已下载数', String(needUpdateDocList.length));
    // 写入缓存
    const cacheJson = {
      docs: this.cachedDocList.map((item) => ({
        id: item.id,
        title: item.title,
        updateTime: item.updateTime,
        properties: item.properties,
        docStructure: item.docStructure,
        error: item.error,
      })) as Partial<DocDetail>[],
      docStructure: notionBaseDocList.map((item) => ({
        id: item.id,
        title: item.properties.title,
      })) as DocStructure[],
    };
    try {
      fs.writeFileSync(this.config.cacheFilePath!, JSON.stringify(cacheJson, null, 2), {
        encoding: 'utf8',
      });
    } catch (e) {
      this.ctx.warn('缓存失败', `写入缓存信息失败，请检查，${e.message}`);
    }
    return docDetailList;
  }
}
