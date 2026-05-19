import { NormalizedYuqueDoc, YuqueWithPwdConfig } from './types';
import { ElogFromContext } from '@elogx-test/elog';
import type { DocDetail, DocStructure, DownloadResult, PluginContext } from '@elogx-test/elog';
import YuqueApi from './YuqueApi';
import { IllegalityDocFormat } from './const';
import { getProps, processMarkdownRaw } from './utils';

export default class YuqueClient extends ElogFromContext {
  private readonly config: YuqueWithPwdConfig;
  private readonly api: YuqueApi;
  constructor(config: YuqueWithPwdConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    // 初始化语雀 api
    this.api = new YuqueApi(config, ctx);
  }

  /**
   * 获取文章详情列表
   */
  // 显式使用公共返回类型，避免声明文件泄露 core 内部的 docStatusMap 条目类型。
  override async getDocDetailList(): Promise<DownloadResult> {
    // 登录
    await this.api.login();
    this.ctx.logger.info('正在获取待更新文档，请稍等...');
    // 获取已排序目录信息
    const tocList = await this.api.getToc();
    // 获取文档列表
    const yuqueBaseDocList = await this.api.getDocList();
    // 根据目录排序文档顺序，处理文档目录
    const sortedDocList: NormalizedYuqueDoc[] = tocList
      .filter((item) => {
        return item.type === 'DOC';
      })
      .map((item) => {
        const doc = yuqueBaseDocList.find((doc) => doc.slug === item.url)!;
        let catalogPath: DocStructure[] = [];
        let parentId = item.parent_uuid;
        for (let i = 0; i < item.level; i++) {
          const current = tocList.find((item) => item.uuid === parentId)!;
          parentId = current.parent_uuid;
          catalogPath.push({
            id: item.url,
            title: current.title,
          });
        }
        return {
          ...doc,
          id: String(doc.id),
          docStructure: catalogPath.reverse(),
          updateTime: new Date(doc.updated_at).getTime(),
        };
      })
      .filter((page) => {
        // 过滤不支持的文档格式
        if (!page.format) return true;
        if (IllegalityDocFormat.some((item) => item === page.format)) {
          this.ctx.logger.warn('注意', `【${page.title}】为不支持的文档格式`);
          return false;
        }
        return true;
      })
      .filter((page) => {
        // 过滤用户配置
        return this.config.onlyPublic ? !!page.public : true;
      })
      .filter((page) => {
        return this.config.onlyPublished ? !!page.status : true;
      });

    const { docList: needUpdateDocList, docStatusMap } = this.filterDocs(sortedDocList);
    // 没有则不需要更新
    if (!needUpdateDocList.length) {
      this.ctx.logger.success('任务结束', '没有需要同步的文档');
      return {
        docDetailList: [],
        sortedDocList,
        docStatusMap,
      };
    }
    this.ctx.logger.info('待下载数', String(needUpdateDocList.length));
    const promise = async (doc: NormalizedYuqueDoc & { _index: number }) => {
      this.ctx.logger.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.title);
      let articleStr = await this.api.getDocString(doc.slug);
      // 处理文档 front-matter
      const { body, properties } = getProps(doc, articleStr, this.ctx);
      // 处理语雀字符串
      let newBody = processMarkdownRaw(body);
      const docDetail: DocDetail = {
        id: doc.id,
        title: doc.title,
        body: newBody,
        properties,
        updateTime: new Date(doc.updated_at).getTime(),
        docStructure: doc.docStructure,
      };
      return docDetail;
    };
    const docDetailList = await this.asyncPool(this.config.limit || 10, needUpdateDocList, promise);
    this.ctx.logger.info('已下载数', String(needUpdateDocList.length));
    return {
      docDetailList,
      sortedDocList,
      docStatusMap,
    };
  }
}
