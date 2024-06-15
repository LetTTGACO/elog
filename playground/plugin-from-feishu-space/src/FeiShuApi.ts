import { DocDetail, ElogBaseContext, PluginContext, SortedDoc } from '@elogx-test/elog';
import { FeiShuClient as FeiShuSDK } from '@feishux/api';
import { FeiShuToMarkdown } from '@feishux/doc-to-md';
import { FeiShuConfig, FeiShuDoc } from './types';
import { IFolderData } from '@feishux/shared';
import { getProps } from './utils';

export default class FeiShuApi extends ElogBaseContext {
  config: FeiShuConfig;
  feishu: FeiShuSDK;
  f2m: FeiShuToMarkdown;
  constructor(config: FeiShuConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!config.appId || !config.appSecret) {
      this.ctx.error('缺少文件夹Token或知识库 ID');
    }
    if (!config.folderToken) {
      this.ctx.error('缺少我的空间中文件夹 ID');
    }
    this.feishu = new FeiShuSDK({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      baseUrl: this.config.baseUrl,
    });
    this.f2m = new FeiShuToMarkdown();
  }

  async getSortedDocList() {
    const tree = await this.feishu.getFolderTree(this.config.folderToken as string);
    const sortedDocList: SortedDoc<FeiShuDoc>[] = [];
    // 深度优先遍历tree
    function dfs(tree: IFolderData[], catalog: any[] = [], level = 0, parent?: IFolderData) {
      tree.map((item) => {
        const newCatalog = [...catalog, { title: parent?.name, doc_id: parent?.token }];
        if (item.type === 'docx') {
          sortedDocList.push({
            id: item.token,
            title: item.name,
            updated: Number(item.modified_time + '000'),
            createdAt: Number(item.created_time + '000'),
            updatedAt: Number(item.modified_time + '000'),
            updateTime: Number(item.modified_time + '000'),
            // 目录信息
            catalog: level > 0 ? newCatalog : [],
          });
        }
        if (item.children) {
          dfs(item.children, level > 0 ? newCatalog : [], level + 1, item);
        }
      });
    }
    dfs(tree);
    return sortedDocList;
  }

  /**
   * 获取文档详情
   * @param doc
   */
  async getDocDetail(doc: FeiShuDoc): Promise<DocDetail> {
    let body = '';
    try {
      const pageBlocks = await this.feishu.getPageBlocks(doc.id);
      body = this.f2m.toMarkdownString(pageBlocks);
    } catch (e: any) {
      this.ctx.warn(`${doc.title} 下载出错: ${e.message}`);
      this.ctx.debug(e);
    }
    // 解析出properties
    const { body: newBody, properties } = getProps(doc, body);
    return {
      id: doc.id,
      properties,
      title: doc.title,
      body: newBody,
      updateTime: doc.updated,
      docStructure: doc.catalog,
    };
  }
}
