import type {
  NotionCatalogConfig,
  NotionConfig,
  NotionDoc,
  NotionQueryParams,
  NotionSort,
} from './types';
import { DocDetail, DocStructure, ElogBaseContext, PluginContext, SortedDoc } from '@elog/cli';
import { Client as NotionClient } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { NotionSortDirectionEnum, NotionSortPresetEnum } from './const';
import { props } from './utils';

export default class NotionApi extends ElogBaseContext {
  config: NotionConfig;
  notion: NotionClient;
  n2m: NotionToMarkdown;
  private dataSourceId?: string;
  requestQueryParams: NotionQueryParams;

  constructor(config: NotionConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!this.config.token) {
      this.ctx.logger.error('缺少 Notion Token');
    }
    if (!this.config.dataSourceId && !this.config.databaseId) {
      this.ctx.logger.error('缺少 Notion dataSourceId 或 databaseId');
    }
    if (this.config.imgToBase64) {
      this.ctx.logger.warn(
        '已开启 Notion 文档图片转 Base64，博客平台的 Markdown 解析器/渲染器并未广泛支持 Base64 格式，请自行确认',
      );
    }
    this.notion = new NotionClient({
      auth: this.config.token,
      notionVersion: '2026-03-11',
    });
    this.n2m = new NotionToMarkdown({
      notionClient: this.notion,
      config: {
        convertImagesToBase64: this.config.imgToBase64,
      },
    });
    this.requestQueryParams = this.initRequestQueryParams();
  }

  private async resolveDataSourceId() {
    if (this.dataSourceId) {
      return this.dataSourceId;
    }
    if (this.config.dataSourceId) {
      this.dataSourceId = this.config.dataSourceId;
      return this.dataSourceId;
    }

    const database = (await this.notion.databases.retrieve({
      database_id: this.config.databaseId!,
    })) as unknown as { data_sources?: Array<{ id: string; name?: string }> };
    const dataSourceId = database.data_sources?.[0]?.id;
    if (!dataSourceId) {
      this.ctx.logger.error(`Notion 数据库 ${this.config.databaseId} 没有可用 data source`);
    }
    this.dataSourceId = dataSourceId;
    return this.dataSourceId;
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
      this.ctx.logger.warn(`${page.properties.title} ${property} 属性缺失`);
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
      this.ctx.logger.warn(
        `${page.properties.title} 文档分类信息提取失败，${property} 字段只能是（Select）单选/（Multi-select）多选`,
      );
      return undefined;
    }
  }

  /**
   * 获取文章列表（不带详情）
   */
  async getSortedDocList() {
    const docList: SortedDoc<NotionDoc>[] = [];
    let startCursor: string | undefined;
    const dataSourceId = await this.resolveDataSourceId();

    // Notion data source 查询结果需要累积到同一个数组，避免递归创建局部数组导致后续页丢失。
    do {
      let resp = await this.notion.dataSources.query({
        data_source_id: dataSourceId,
        ...this.requestQueryParams,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      });
      let docs = resp.results as SortedDoc<NotionDoc>[];
      docs = docs.map((doc) => {
        // 转换props
        doc.properties = props(doc);
        return {
          ...doc,
          updateTime: new Date(doc.last_edited_time).getTime(),
        };
      });
      docList.push(...docs);

      // 游标只用于本轮列表拉取，不写回实例配置，避免下一次同步从中间页开始。
      startCursor = resp.has_more && resp.next_cursor ? resp.next_cursor : undefined;
    } while (startCursor);

    return docList;
  }

  /**
   * 获取文章详情
   * @param {*} page
   */
  async getDocDetail(page: NotionDoc): Promise<DocDetail> {
    const blocks = await this.n2m.pageToMarkdown(page.id);
    if (!blocks.length) {
      this.ctx.logger.warn(`${page.properties.title} 文档下载超时或无内容 `);
    }
    const body = this.n2m.toMarkdownString(blocks)?.parent || '';
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
