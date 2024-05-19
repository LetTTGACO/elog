import { YuqueDoc, YuqueWithPwdConfig } from './types';
import { DocDetail, DocStructure, ElogFromContext, PluginContext } from '@elogx-test/elog';
import YuqueApi from './YuqueApi';
import { IllegalityDocFormat } from './const';
import { getProps, processMarkdownRaw } from './utils';

export default class YuqueClient extends ElogFromContext {
  private readonly config: YuqueWithPwdConfig;
  private readonly api: YuqueApi;
  constructor(config: YuqueWithPwdConfig, ctx: PluginContext) {
    super(ctx, config);
    this.config = config;
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
    // 获取已排序目录信息
    const sortedDocList = await this.api.getSortedDocList();
    // 获取文档列表
    let yuqueBaseDocList = await this.api.getDocList();
    // 根据目录排序文档顺序，处理文档目录
    yuqueBaseDocList = sortedDocList
      .filter((item) => {
        return item.type === 'DOC';
      })
      .map((item) => {
        const doc = yuqueBaseDocList.find((doc) => doc.slug === item.url)!;
        let catalogPath: DocStructure[] = [];
        let parentId = item.parent_uuid;
        for (let i = 0; i < item.level; i++) {
          const current = sortedDocList.find((item) => item.uuid === parentId)!;
          parentId = current.parent_uuid;
          catalogPath.push({
            id: item.url,
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
        // 过滤用户配置
        return this.config.onlyPublic ? !!page.public : true;
      });

    const { docList: needUpdateDocList, idMap } = this.filterDocs(
      yuqueBaseDocList,
      'slug',
      'updated_at',
    );
    // 没有则不需要更新
    if (!needUpdateDocList.length) {
      this.ctx.success('任务结束', '没有需要同步的文档');
      process.exit();
    }
    this.ctx.info('待下载数', String(needUpdateDocList.length));
    const promise = async (doc: YuqueDoc) => {
      this.ctx.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.title);
      let articleStr = await this.api.getDocString(doc.slug);
      // 处理文档 front-matter
      const { body, properties } = getProps(doc, articleStr, this.ctx);
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
    const docDetailList = await this.asyncPool(this.config.limit || 3, needUpdateDocList, promise);
    // 更新缓存里的文章
    this.updateCache(docDetailList, idMap);
    this.ctx.info('已下载数', String(needUpdateDocList.length));
    // 写入缓存
    this.writeCache({
      sortedDocList: yuqueBaseDocList.map((item) => ({
        id: item.slug,
        title: item.title,
      })),
    });
    return docDetailList;
  }
}
