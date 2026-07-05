import { DocDetail, ElogBaseContext, PluginContext, SortedDoc } from '@elog/cli';
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
      this.ctx.logger.error('缺少文件夹Token或知识库 ID');
    }
    if (!config.folderToken) {
      this.ctx.logger.error('缺少我的空间中文件夹 ID');
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
            properties: {
              title: item.name,
            },
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
      this.ctx.logger.warn(`${doc.title} 下载出错: ${e.message}`);
      this.ctx.logger.debug(e);
    }
    // 解析出properties
    let { body: newBody, properties } = getProps(doc, body);
    // 处理图片
    const imgList = this.ctx.image.getUrlListFromContent(newBody);
    for (let i = 0; i < imgList.length; i++) {
      const token = imgList[i].data;
      const base64 = await this.bufferToBase64(token);
      newBody = newBody.replace(imgList[i].data, base64);
    }
    return {
      id: doc.id,
      properties,
      title: doc.title,
      body: newBody,
      updateTime: doc.updated,
      docStructure: doc.catalog,
    };
  }

  async bufferToBase64(token: string) {
    const res = await this.feishu.getResourceItem(token);
    const buffer = getResourceBuffer(res);
    const name = getResourceName(res, token);
    return `data:image/${getImageSubtype(name)};base64,${buffer.toString('base64')}`;
  }
}

const getResourceBuffer = (res: unknown) => {
  const item = res as { buffer?: Buffer | { data?: Buffer } };
  return Buffer.isBuffer(item.buffer) ? item.buffer : (item.buffer?.data as Buffer);
};

const getResourceName = (res: unknown, fallback: string) => {
  const item = res as { name?: string; filename?: string; fileName?: string };
  return item.name || item.filename || item.fileName || fallback;
};

const getImageSubtype = (name: string) => {
  const filename = name.split(/[?#]/)[0].split('/').pop();
  const extIndex = filename?.lastIndexOf('.') ?? -1;
  const ext = extIndex > 0 ? filename?.substring(extIndex + 1).toLowerCase() : undefined;
  return ext && /^[a-z0-9]+$/.test(ext) ? ext : 'png';
};
