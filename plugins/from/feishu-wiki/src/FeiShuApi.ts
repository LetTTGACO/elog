import { DocDetail, ElogBaseContext, PluginContext, SortedDoc } from '@elog/cli';
import { FeiShuClient as FeiShuSDK } from '@feishux/api';
import { FeiShuToMarkdown } from '@feishux/doc-to-md';
import { FeiShuConfig, FeiShuDoc } from './types';
import type { IWikiNode } from '@feishux/shared';
import { getProps } from './utils';

export default class FeiShuApi extends ElogBaseContext {
  config: FeiShuConfig;
  feishu: FeiShuSDK;
  f2m: FeiShuToMarkdown;
  constructor(config: FeiShuConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!config.appId || !config.appSecret) {
      this.ctx.logger.error('缺少文件夹Token或知识库 ID');
    }
    if (!config.wikiId) {
      this.ctx.logger.error('缺少知识库 ID');
    }
    this.feishu = new FeiShuSDK({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      baseUrl: this.config.baseUrl,
    });
    this.f2m = new FeiShuToMarkdown();
  }

  async getSortedDocList() {
    // 获取知识库字节点
    const tree = await this.feishu.getReposNodesTree(
      this.config.wikiId as string,
      this.config.folderToken,
    );
    const sortedDocList: SortedDoc<FeiShuDoc & Partial<IWikiNode>>[] = [];
    const self = this;

    // 深度优先遍历tree
    function dfs(tree: IWikiNode[], catalog: any[] = [], level = 0, parent?: IWikiNode) {
      tree.forEach((item) => {
        const newCatalog = [
          ...catalog,
          { title: parent?.title, doc_id: parent?.obj_token || parent?.node_token },
        ];
        if (item.obj_type == 'doc' || item.obj_type == 'docx') {
          const doc: SortedDoc<FeiShuDoc & Partial<IWikiNode>> = {
            id: item.obj_token,
            properties: {
              title: item.title,
            },
            title: item.title,
            createdAt: Number(item.obj_create_time + '000'),
            updated: Number(item.obj_edit_time + '000'),
            updatedAt: Number(item.obj_edit_time + '000'),
            has_child: item.has_child,
            node_token: item.node_token,
            parent_node_token: item.parent_node_token,
            updateTime: Number(item.obj_edit_time + '000'),
            catalog: level > 0 ? newCatalog : [],
          };
          // 首先检查 item 是否没有实际子节点，或者 self.config.disableParentDoc 是否不为 true。
          // 如果这两个条件中的任何一个为 true，那么 doc 对象就会被添加到 self.catalog 数组中
          // disableParentDoc 就是为了控制当父文档下存在文档时，父文档需不需要下载
          if (!item.children?.length || !self.config.disableParentDoc) {
            sortedDocList.push(doc);
          }
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
      this.ctx.logger.warn(`${doc.title} 下载出错: ${e.message}`);
      this.ctx.logger.debug(e);
    }
    // 解析出properties
    let { body: newBody, properties } = getProps(doc, body);
    // 处理图片
    const imgList = this.ctx.image.getUrlListFromContent(newBody);
    for (let i = 0; i < imgList.length; i++) {
      const token = imgList[i].data;
      const dataUrl = await this.bufferToBase64(token);
      newBody = newBody.replace(imgList[i].data, dataUrl);
    }
    return {
      id: doc.id,
      properties,
      title: doc.title,
      body: newBody,
      bodyType: 'markdown',
      updateTime: doc.updated,
      docStructure: doc.catalog,
    };
  }

  async bufferToBase64(token: string) {
    const res = await this.feishu.getResourceItem(token);
    const buffer = Buffer.isBuffer(res.buffer) ? res.buffer : res.buffer.data;
    return `data:image/${res.type || 'png'};base64,${buffer.toString('base64')}`;
  }
}
