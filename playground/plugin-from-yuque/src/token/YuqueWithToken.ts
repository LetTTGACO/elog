import { DocStatusMap, YuqueDoc, YuqueWithTokenConfig } from '../types';
import type { DocDetail, DocStructure, PluginContext } from '@elogx-test/elog';
import YuqueApi from './YuqueApi';
import { DocStatus, IllegalityDocFormat } from '../const';
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
    this.config.cacheFilePath = this.config.cacheFilePath || 'elog.cache.json';
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
    const catalogList = await this.api.getToc();
    // 获取文档列表
    let yuqueBaseDocList = await this.api.getDocList();
    // 根据目录排序文档顺序，处理文档目录
    yuqueBaseDocList = catalogList
      .filter((item) => {
        return item.type === 'DOC';
      })
      .map((item, index) => {
        const doc = yuqueBaseDocList.find((doc) => doc.slug === item.slug)!;
        let catalogPath: DocStructure[] = [];
        let parentId = item.parent_uuid;
        for (let i = 0; i < item.level; i++) {
          const current = catalogList.find((item) => item.uuid === parentId)!;
          parentId = current.parent_uuid;
          catalogPath.push({
            id: item.slug,
            title: current.title,
          });
        }
        return {
          ...doc,
          docStructure: catalogPath.reverse(),
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

    if (!yuqueBaseDocList?.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }
    // 过滤掉被删除的文章
    this.cachedDocList = this.cachedDocList.filter((cache) => {
      return yuqueBaseDocList.findIndex((item) => item.slug === cache.id) !== -1;
    });
    let needUpdateDocList: YuqueDoc[] = [];
    let idMap: DocStatusMap = {};
    for (const article of yuqueBaseDocList) {
      // 判断哪些文章是新增的
      const cacheIndex = this.cachedDocList.findIndex((cacheItem) => cacheItem.id === article.slug);
      // 新增的则加入需要下载的ids列表
      if (cacheIndex < 0) {
        needUpdateDocList.push({ ...article, _index: needUpdateDocList.length + 1 });
        // 记录被更新文章状态
        idMap[article.slug] = {
          updateIndex: -1,
          status: DocStatus.create,
        };
      } else {
        // 不是新增的则判断是否文章更新了
        const cacheDoc = this.cachedDocList[cacheIndex];
        let needUpdate = new Date(article.updated_at).getTime() !== cacheDoc.updateTime;
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
          idMap[article.slug] = {
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
    const promise = async (doc: YuqueDoc) => {
      this.ctx.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.title);
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
      docStructure: yuqueBaseDocList.map((item) => ({
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