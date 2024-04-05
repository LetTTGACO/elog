import { YuqueDoc, YuqueWithPwdConfig } from '../types';
import type { DocDetail, DocDirectoryInfo, PluginContext } from '@elogx-test/elog';
import YuqueApi from './YuqueApi';
import { IllegalityDocFormat } from '../const';
import { getProps, processMarkdownRaw } from '../utils';
import asyncPool from 'tiny-async-pool';

export default class YuqueWithPwd {
  private readonly config: YuqueWithPwdConfig;
  private readonly ctx: PluginContext;
  private readonly api: YuqueApi;
  constructor(config: YuqueWithPwdConfig, ctx: PluginContext) {
    this.config = config;
    this.ctx = ctx;
    if (!this.config.username || !this.config.password || !this.config.login || !this.config.repo) {
      this.ctx.error('缺少语雀配置信息');
    }
    this.config.baseUrl = this.config.baseUrl || 'https://www.yuque.com';
    if (this.config.baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      this.config.baseUrl = this.config.baseUrl.slice(0, -1);
    }
    // 初始化语雀 api
    this.api = new YuqueApi(config, ctx);
  }

  /**
   * 获取文章详情列表
   */
  async getDocDetailList() {
    // 登录
    await this.api.login();
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
        const doc = yuqueDocs.find((doc) => doc.slug === item.url)!;
        let catalogPath: DocDirectoryInfo[] = [];
        let parentId = item.parent_uuid;
        for (let i = 0; i < item.level; i++) {
          const current = catalog.find((item) => item.uuid === parentId)!;
          parentId = current.parent_uuid;
          catalogPath.push({
            title: current.title,
            id: item.url,
          });
        }
        return {
          ...doc,
          directoryInfo: catalogPath.reverse(),
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
    const docDetailList: DocDetail[] = [];
    const promise = async (doc: YuqueDoc) => {
      this.ctx.info(`下载文档 ${doc._index}/${yuqueDocs.length}   `, doc.title);
      let articleStr = await this.api.getDocString(doc.slug);
      // 处理文档 front-matter
      const { body, properties } = getProps(doc, articleStr, this.ctx, true);
      // 处理语雀字符串
      let newBody = processMarkdownRaw(body);
      const docDetail: DocDetail = {
        id: doc.slug,
        title: doc.title,
        body: newBody,
        properties,
        updateTime: new Date(doc.updated_at).getTime(),
        directoryInfo: doc.directoryInfo,
      };
      return docDetail;
    };
    for await (const docDetail of asyncPool(this.config.limit || 3, yuqueDocs, promise)) {
      docDetailList.push(docDetail);
    }
    this.ctx.info('已下载数', String(yuqueDocs.length));
    return docDetailList;
  }
}
