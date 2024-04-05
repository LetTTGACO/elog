import { YuqueDoc, YuqueWithTokenConfig } from '../types';
import type { DocDetail, DocStructure, PluginContext } from '@elogx-test/elog';
import YuqueApi from './YuqueApi';
import { IllegalityDocFormat } from '../const';
import { asyncPoolAll, getProps, processMarkdownRaw } from '../utils';
import Context from '../Context';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default class YuqueWithToken extends Context {
  private readonly config: YuqueWithTokenConfig;
  private readonly api: YuqueApi;
  private cachedDocList: DocDetail[] = [];
  constructor(config: YuqueWithTokenConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!this.config.token || !this.config.repo || !this.config.login) {
      this.ctx.info('请查阅Elog配置文档: https://elog.1874.cool/notion/write-platform');
      this.ctx.error('缺少语雀配置信息');
    }
    this.config.baseUrl = this.config.baseUrl || 'https://www.yuque.com';
    if (this.config.baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      this.config.baseUrl = this.config.baseUrl.slice(0, -1);
    }
    // 初始化语雀 api
    this.api = new YuqueApi(config, ctx);
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
   * 获取文章详情列表
   */
  async getDocDetailList() {
    this.ctx.info('正在获取文档列表，请稍等...');
    // 获取目录
    const catalog = await this.api.getToc();
    // 获取文档列表
    let yuqueDocs = await this.api.getDocList();
    // 根据目录排序文档顺序，处理文档目录
    yuqueDocs = catalog
      .filter((item) => {
        return item.type === 'DOC';
      })
      .map((item, index) => {
        const doc = yuqueDocs.find((doc) => doc.slug === item.slug)!;
        let catalogPath: DocStructure[] = [];
        let parentId = item.parent_uuid;
        for (let i = 0; i < item.level; i++) {
          const current = catalog.find((item) => item.uuid === parentId)!;
          parentId = current.parent_uuid;
          catalogPath.push({
            title: current.title,
            id: item.slug,
          });
        }
        return {
          ...doc,
          docStructure: catalogPath.reverse(),
          _index: index + 1,
        } as YuqueDoc;
      })
      .filter((page) => {
        // 过滤不支持的文档格式
        if (!page.format) return true;
        if (IllegalityDocFormat.some((item) => item === page.format)) {
          this.ctx.warn('注意', `【${page.title}】为不支持的文档格式`);
          return false;
        }
        return true;
      })
      .filter((page) => {
        // 过滤配置
        return this.config.onlyPublic ? !!page.public : true;
      });

    if (!yuqueDocs?.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }
    // 过滤掉被删除的文章
    this.cachedDocList = this.cachedDocList.filter((cache) => {
      return yuqueDocs.findIndex((item) => item.slug === cache.id) !== -1;
    });
    let needUpdateDocs: YuqueDoc[] = [];
    let idMap: any = {};
    for (const article of yuqueDocs) {
      // 判断哪些文章是新增的
      const cacheIndex = this.cachedDocList.findIndex((cacheItem) => cacheItem.id === article.slug);
      // 新增的则加入需要下载的ids列表
      if (cacheIndex < 0) {
        needUpdateDocs.push({ ...article, _index: needUpdateDocs.length + 1 });
        // 记录被更新文章状态
        idMap[article.slug] = {
          status: 'create',
        };
      } else {
        // 不是新增的则判断是否文章更新了
        const cacheArticle = this.cachedDocList[cacheIndex];
        const cacheAvailable = new Date(article.updated_at).getTime() === cacheArticle.updateTime;

        if (cacheArticle.error === 1) {
          this.ctx.warn(
            `上次同步时 【${cacheArticle.properties.title}】 存在图片下载失败，本次将尝试重新同步`,
          );
        }
        if (!cacheAvailable || cacheArticle.error === 1) {
          // 如果文章更新了则加入需要下载的ids列表, 没有更新则不需要下载
          needUpdateDocs.push({ ...article, _index: needUpdateDocs.length + 1 });
          // 记录被更新文章状态和索引
          idMap[article.slug] = {
            index: cacheIndex,
            status: 'update',
          };
        }
      }
    }
    // 没有则不需要更新
    if (!needUpdateDocs.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }

    let docDetailList: DocDetail[] = [];
    const promise = async (doc: YuqueDoc) => {
      this.ctx.info(`下载文档 ${doc._index}/${needUpdateDocs.length}   `, doc.title);
      let article = await this.api.getDocDetail(doc.slug);
      // 处理文档 front-matter
      const { body, properties } = getProps(doc, article.body, this.ctx);
      // 处理语雀字符串
      let newBody = processMarkdownRaw(body);
      const docDetail: DocDetail = {
        id: doc.slug,
        title: doc.title,
        body: newBody,
        properties,
        updateTime: new Date(doc.updated_at).getTime(),
        docStructure: doc.docStructure,
      };
      return docDetail;
    };
    docDetailList = await asyncPoolAll(this.config.limit || 3, needUpdateDocs, promise);
    // 更新缓存里的文章
    for (const docDetail of docDetailList) {
      const { index, status } = idMap[docDetail.id];
      if (status === 'create') {
        // 新增文档
        this.cachedDocList.push(docDetail);
      } else {
        // 更新文档
        this.cachedDocList[index] = docDetail;
      }
    }
    this.ctx.info('已下载数', String(needUpdateDocs.length));
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
      docStructure: yuqueDocs.map((item) => ({
        id: item.slug,
        title: item.title,
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
