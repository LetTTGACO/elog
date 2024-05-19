import {
  WoLaiCatalogConfig,
  WoLaiConfig,
  WoLaiDoc,
  WolaiFilterAndSortParams,
  WoLaiTablePage,
  WoLaiTableRows,
} from './types';
import {
  DocDetail,
  DocProperties,
  DocStructure,
  ElogBaseContext,
  PluginContext,
} from '@elogx-test/elog';
import { WolaiSortPresetEnum, WolaiSortDirectionEnum } from './const';
import { filterDocs, genCatalog, props, sortDocs } from './utils';
import buffer from 'buffer';

export default class WolaiApi extends ElogBaseContext {
  config: WoLaiConfig;
  constructor(config: WoLaiConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.config.baseUrl = config.baseUrl || 'https://api.wolai.com/v1';
    if (!config.token || !config.pageId) {
      this.ctx.error('缺少WoLai配置信息');
    }
    this.initCatalogConfig();
  }

  /**
   * 初始化目录配置
   */
  private initCatalogConfig() {
    if (typeof this.config.catalog === 'boolean') {
      if (!this.config.catalog) {
        // 不启用目录
        this.config.catalog = { enable: false };
      } else {
        // 启用目录
        this.ctx.success('开启分类', '默认按照 catalog 字段分类，请检查FlowUs多维表是否存在该属性');
        this.config.catalog = { enable: true, property: 'catalog' };
      }
    } else if (typeof this.config.catalog === 'object') {
      if (this.config.catalog.enable) {
        // 检查分类字段是否存在
        if (!this.config.catalog.property) {
          this.config.catalog.property = 'catalog';
          this.ctx.warn(
            '未设置分类字段，默认按照 catalog 字段分类，请检查FlowUs多维表是否存在该属性',
          );
        }
      }
    }
  }

  /**
   * 初始化过滤和排序参数
   */
  private initFilterAndSortParamsParams(): WolaiFilterAndSortParams {
    let sort = this.config.sort as WolaiFilterAndSortParams['sort'];
    if (typeof this.config.sort === 'boolean') {
      if (!this.config.sort) {
        // 不排序
        sort = undefined;
      } else {
        // 默认排序
        sort = { property: 'createdAt', direction: WolaiSortDirectionEnum.descending };
      }
    } else if (typeof this.config.sort === 'string') {
      // 预设值
      const sortPreset = this.config.sort as WolaiSortPresetEnum;
      switch (sortPreset) {
        case WolaiSortPresetEnum.dateDesc:
          sort = { property: 'date', direction: WolaiSortDirectionEnum.descending };
          break;
        case WolaiSortPresetEnum.dateAsc:
          sort = { property: 'date', direction: WolaiSortDirectionEnum.ascending };
          break;
        case WolaiSortPresetEnum.sortDesc:
          sort = { property: 'sort', direction: WolaiSortDirectionEnum.descending };
          break;
        case WolaiSortPresetEnum.sortAsc:
          sort = { property: 'sort', direction: WolaiSortDirectionEnum.ascending };
          break;
        case WolaiSortPresetEnum.createTimeDesc:
          sort = {
            property: 'createdAt',
            direction: WolaiSortDirectionEnum.descending,
          };
          break;
        case WolaiSortPresetEnum.createTimeAsc:
          sort = {
            property: 'createdAt',
            direction: WolaiSortDirectionEnum.ascending,
          };
          break;
        case WolaiSortPresetEnum.updateTimeDesc:
          sort = {
            property: 'updatedAt',
            direction: WolaiSortDirectionEnum.descending,
          };
          break;
        case WolaiSortPresetEnum.updateTimeAsc:
          sort = {
            property: 'updatedAt',
            direction: WolaiSortDirectionEnum.ascending,
          };
          break;
        default:
          sort = {
            property: 'createdAt',
            direction: WolaiSortDirectionEnum.descending,
          };
      }
    }

    let filter = this.config.filter as WolaiFilterAndSortParams['filter'];
    // 如果是boolean类型
    if (typeof this.config.filter === 'boolean') {
      // 如果设置为false
      if (!this.config.filter) {
        filter = undefined;
      } else {
        // 如果设置为true
        filter = {
          property: 'status',
          value: '已发布',
        };
      }
    }
    return {
      filter,
      sort,
    };
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   * @param custom
   */
  private async requestInternal<T>(api: string, reqOpts: any, custom?: boolean): Promise<T> {
    const url = `${this.config.baseUrl}/${api}`;
    // 将 token 设置到请求 cookie 中
    const cookie = `token=${this.config.token}`;
    const opts: any = {
      headers: {
        cookie,
      },
      ...reqOpts,
    };
    if (custom) {
      const res = await this.ctx.request<T>(url, opts);
      return res.data;
    }
    const res = await this.ctx.request<any>(url, opts);
    // TODO 校验数据库是否公开网络
    // if (res.status !== 200) {
    //   if (res.status === 404 && res.data?.message === 'book not found') {
    //     this.ctx.info('请参考配置文档：https://elog.1874.cool/notion/write-platform');
    //     this.ctx.error('知识库不存在，请检查配置');
    //   } else {
    //     this.ctx.error(res.data?.message || res);
    //   }
    // }
    return res.data.data;
  }

  async getSortedDocList() {
    // 获取表格信息
    const tablePage = await this.requestInternal<WoLaiTablePage>('pages/getPageChunks', {
      method: 'post',
      data: {
        pageId: this.config.pageId,
        limit: 100,
        position: {
          stack: [],
        },
        chunkNumber: 0,
      },
    });
    const databaseId = tablePage.block[this.config.pageId].value.database_id;
    // 获取表格文档列表
    const list = await this.requestInternal<WoLaiTableRows>('database/tableViewRows', {
      method: 'post',
      data: {
        table_id: databaseId,
        // TODO "view_id": "",
        limit: 1000,
        value: 'all',
        offset: 0,
        disableGroup: false,
        filters: {
          logical: 'and',
          filters: [],
        },
        sorters: [],
        group: false,
        search: '',
        snapshot: null,
        timezoneOffset: -480,
      },
    });
    // 转换 props
    const tableFields = tablePage.database_tables[databaseId].properties;
    let docs = list.rows.map((row) => {
      const properties = props(row, tableFields);
      return {
        ...row,
        createdAt: row.created_time,
        updatedAt: row.edited_time,
        properties,
        id: row.block_id,
      } as WoLaiDoc;
    });
    const { filter, sort } = this.initFilterAndSortParamsParams();
    // 过滤
    docs = filterDocs(docs, filter);
    // 排序
    docs = sortDocs(docs, sort);
    return docs;
  }

  /**
   * 获取文档详情
   * @param row
   */
  async getDocDetail(row: WoLaiDoc): Promise<DocDetail> {
    const url = await this.requestInternal<string>('exportMarkdown', {
      method: 'post',
      data: {
        pageId: row.block_id,
        pageTitle: row.properties.title,
        options: {
          recoverTree: false,
          generateToc: 'none',
          includeSubPage: false,
        },
      },
    });
    // 从 url 下载buffer
    const res = await this.requestInternal<Buffer>(
      url,
      { method: 'get', dataType: 'buffer' },
      true,
    );
    // Buffer 转字符串
    const body = buffer.Buffer.from(res).toString('utf-8');
    const doc: DocDetail = {
      id: row.block_id,
      properties: row.properties as DocProperties,
      body,
      updateTime: row.edited_time,
      title: row.properties.title,
    };
    let catalog: DocStructure[] | undefined = [];
    const catalogConfig = this.config.catalog as WoLaiCatalogConfig;
    if (catalogConfig?.enable) {
      // 生成目录
      catalog = genCatalog(doc, catalogConfig.property || 'catalog');
    }
    return {
      ...doc,
      docStructure: catalog,
    };
  }
}
