import type { DocDetail, PluginContext } from '@elog/plugin-sdk';
import ConfluenceApi from './ConfluenceApi';
import Context from './Context';
import type { ConfluenceConfig, WikiMap } from './types';

function assertConfluenceWikiBodyTypes(docs: DocDetail[], error: PluginContext['logger']['error']) {
  for (const doc of docs) {
    const bodyType = doc.bodyType ?? 'markdown';
    if (bodyType !== 'confluence-wiki') {
      error(
        `Confluence target expects Confluence wiki Document Body, received ${bodyType} for ${doc.properties.title}. Add the Markdown-to-Confluence wiki Body Transform before deploying to Confluence.`,
      );
    }
  }
}

export default class ConfluenceDeploy extends Context {
  private readonly api: ConfluenceApi;

  constructor(config: ConfluenceConfig, ctx: PluginContext) {
    super(ctx);
    this.api = new ConfluenceApi(config, ctx);
  }

  async deploy(docs: DocDetail[]) {
    if (docs.length === 0) {
      this.ctx.logger.error('没有可部署的文档');
    }
    assertConfluenceWikiBodyTypes(docs, this.ctx.logger.error);
    this.ctx.logger.success('正在部署到Confluence...');
    const articleList = JSON.parse(JSON.stringify(docs)) as DocDetail[];
    // 重新排序articleList，按照层级更新文章
    // 先更新第一级，再更新第二级...
    const sortArticleList = articleList.sort((a, b) => {
      if (!a.docStructure || !b.docStructure) {
        return 0;
      }
      return a.docStructure.length - b.docStructure.length;
    });
    // 获取rootPage下的文章列表
    const rootPageList = await this.api.getRootPageList();
    let rootPageMap: WikiMap = {};
    // List转Map
    rootPageList.forEach((item) => {
      rootPageMap[item.title] = item;
    });
    // 根据目录上传到wiki上
    for (const articleInfo of sortArticleList) {
      // 是否存在
      const cacheWikiPage = rootPageMap[articleInfo.properties.title];
      if (cacheWikiPage) {
        this.ctx.logger.info('更新文档', cacheWikiPage.title);
        // 获取版本信息
        const updatingPage = await this.api.getPageById(cacheWikiPage.id);
        const version = updatingPage.version.number + 1;
        await this.api.updatePage(articleInfo, cacheWikiPage.id, version);
      } else {
        this.ctx.logger.info('新增文档', articleInfo.properties.title);
        // 新增
        // 在rootPageMap中找到parent title
        let parentId = '';
        const catalog = articleInfo.docStructure;
        if (catalog?.length) {
          const parentTitle = catalog[catalog.length - 1].title;
          parentId = rootPageMap[parentTitle]?.id;
        }
        // 直接新增
        // 如果有parentId就存在parentPage下，没有则存在空间的rootPage下
        try {
          const createdPage = await this.api.createPage(articleInfo, parentId);
          // 临时更新Map
          rootPageMap[createdPage.title] = createdPage;
        } catch (e: any) {
          // 有可能是重名更新失败
          if (e.message.indexOf('A page with this title already exists') > -1) {
            this.ctx.logger.error(
              `文章标题已存在于confluence, 请检查: ${articleInfo.properties.title}`,
            );
          } else {
            this.ctx.logger.error(e.message);
          }
        }
      }
    }
    return undefined;
  }
}
