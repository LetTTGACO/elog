import Context from './Context';
import type {
  NotionCatalogConfig,
  NotionConfig,
  NotionDoc,
  NotionQueryParams,
  NotionSort,
} from './types';
import { DocDetail, DocStructure, PluginContext } from '@elogx-test/elog';
import { Client as NotionClient } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NotionSortDirectionEnum, NotionSortPresetEnum } from './const';
import { props } from './utils';

export default class NotionApi extends Context {
  config: NotionConfig;
  notion: NotionClient;
  n2m: NotionToMarkdown;
  requestQueryParams: NotionQueryParams;

  constructor(config: NotionConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!this.config.token) {
      this.ctx.error('缺少 Notion Token');
    }
    if (!this.config.databaseId) {
      this.ctx.error('缺少Notion 数据库 ID');
    }
    if (this.config.imgToBase64) {
      this.ctx.error(
        '已开启 Notion 文档图片转 Base64，博客平台的 Markdown 解析器/渲染器并未广泛支持 Base64 格式，请自行确认',
      );
    }
    this.notion = new NotionClient({ auth: this.config.token });
    this.n2m = new NotionToMarkdown({
      notionClient: this.notion,
      config: {
        convertImagesToBase64: this.config.imgToBase64,
      },
    });
    this.requestQueryParams = this.initRequestQueryParams();
  }

  /**
   * 初始化请求参数
   */
  initRequestQueryParams() {
    let sorts: any;
    if (typeof this.config.sorts === 'boolean') {
      if (!this.config.sorts) {
        // 不排序
        sorts = undefined;
      } else {
        // 默认排序
        sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.descending }];
      }
    } else if (typeof this.config.sorts === 'string') {
      // 预设值
      const sortPreset = this.config.sorts as NotionSortPresetEnum;
      switch (sortPreset) {
        case NotionSortPresetEnum.dateDesc:
          sorts = [{ property: 'date', direction: NotionSortDirectionEnum.descending }];
          break;
        case NotionSortPresetEnum.dateAsc:
          sorts = [{ property: 'date', direction: NotionSortDirectionEnum.ascending }];
          break;
        case NotionSortPresetEnum.sortDesc:
          sorts = [{ property: 'sort', direction: NotionSortDirectionEnum.descending }];
          break;
        case NotionSortPresetEnum.sortAsc:
          sorts = [{ property: 'sort', direction: NotionSortDirectionEnum.ascending }];
          break;
        case NotionSortPresetEnum.createTimeDesc:
          sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.descending }];
          break;
        case NotionSortPresetEnum.createTimeAsc:
          sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.ascending }];
          break;
        case NotionSortPresetEnum.updateTimeDesc:
          sorts = [
            { timestamp: 'last_edited_time', direction: NotionSortDirectionEnum.descending },
          ];
          break;
        case NotionSortPresetEnum.updateTimeAsc:
          sorts = [{ timestamp: 'last_edited_time', direction: NotionSortDirectionEnum.ascending }];
          break;
        default:
          sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.descending }];
      }
    } else {
      // 自定义排序
      sorts = this.config.sorts as NotionSort[];
    }

    let filter: any;
    if (typeof this.config.filter === 'boolean') {
      if (!this.config.filter) {
        filter = undefined;
      } else {
        filter = {
          property: 'status',
          select: {
            equals: '已发布',
          },
        };
      }
    } else if (!this.config.filter) {
      filter = undefined;
    } else {
      filter = this.config.filter;
    }
    return {
      database_id: this.config.databaseId,
      filter,
      sorts,
    };
  }

  /**
   * 生成文章目录结构目录
   * @param page
   * @param property
   */
  getDocStructure(page: NotionDoc, property: string): DocStructure[] | undefined {
    const catalog = page.properties[property];
    if (!catalog) {
      this.ctx.warn(`${page.properties.title} ${property} 属性缺失`);
      return undefined;
    } else if (typeof catalog === 'string') {
      // 单选
      return [
        {
          title: catalog,
          id: page.id,
        },
      ];
    } else if (Array.isArray(catalog)) {
      // 多选
      return catalog.map((item) => {
        return {
          title: item,
          id: page.id,
        };
      });
    } else {
      // 没有值
      this.ctx.warn(
        `${page.properties.title} 文档分类信息提取失败，${property} 字段只能是（Select）单选/（Multi-select）多选`,
      );
      return undefined;
    }
  }

  /**
   * 获取文章列表（不带详情）
   */
  async getDocList() {
    const docList: NotionDoc[] = [];
    const getList = async () => {
      let resp = await this.notion.databases.query({
        ...this.requestQueryParams,
      });
      let docs = resp.results as NotionDoc[];
      docs = docs.map((doc) => {
        // 转换props
        doc.properties = props(doc);
        return doc;
      });
      docList.push(...docs);
      // 分页查询
      if (resp.has_more && resp.next_cursor) {
        // 有更多数据
        this.requestQueryParams = {
          ...this.requestQueryParams,
          start_cursor: resp.next_cursor,
        };
        await this.getDocList();
      }
    };
    await getList();
    return docList;
  }

  /**
   * 获取文章详情
   * @param {*} page
   */
  async getDocDetail(page: NotionDoc): Promise<DocDetail> {
    const blocks = await this.n2m.pageToMarkdown(page.id);
    if (!blocks.length) {
      this.ctx.warn(`${page.properties.title} 文档下载超时或无内容 `);
    }
    let body = this.n2m.toMarkdownString(blocks)?.parent || '';
    const timestamp = new Date(page.last_edited_time).getTime();
    let docStructure: DocStructure[] | undefined;
    const catalogConfig = this.config.catalog as NotionCatalogConfig;
    if (catalogConfig?.enable) {
      // 生成目录
      docStructure = this.getDocStructure(page, catalogConfig.property!);
    }
    return {
      id: page.id,
      title: page.properties.title,
      properties: page.properties,
      body,
      updateTime: timestamp,
      docStructure,
    } as DocDetail;
  }
}
