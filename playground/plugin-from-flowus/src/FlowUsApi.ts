import { FlowUsCatalogConfig, FlowUsConfig, FlowUsDoc, FlowUsFilterAndSortParams } from './types';
import { DocDetail, DocStructure, ElogBaseContext, PluginContext } from '@elogx-test/elog';
import { FlowUsSortDirectionEnum, FlowUsSortPresetEnum } from './const';
import { FlowUsClient as FlowUsSDK } from '@flowusx/flowus-client';
import { filterDocs, genCatalog, props, sortDocs } from './utils';
import { FlowUsToMarkdown } from '@flowusx/flowus-to-md';

export default class FlowUsApi extends ElogBaseContext {
  config: FlowUsConfig;
  flowus: FlowUsSDK;
  f2m: FlowUsToMarkdown;
  constructor(config: FlowUsConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.flowus = new FlowUsSDK();
    this.f2m = new FlowUsToMarkdown({ client: this.flowus });
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
  private initFilterAndSortParamsParams(): FlowUsFilterAndSortParams {
    let sort = this.config.sort as FlowUsFilterAndSortParams['sort'];
    if (typeof this.config.sort === 'boolean') {
      if (!this.config.sort) {
        // 不排序
        sort = undefined;
      } else {
        // 默认排序
        sort = { property: 'createdAt', direction: FlowUsSortDirectionEnum.descending };
      }
    } else if (typeof this.config.sort === 'string') {
      // 预设值
      const sortPreset = this.config.sort as FlowUsSortPresetEnum;
      switch (sortPreset) {
        case FlowUsSortPresetEnum.dateDesc:
          sort = { property: 'date', direction: FlowUsSortDirectionEnum.descending };
          break;
        case FlowUsSortPresetEnum.dateAsc:
          sort = { property: 'date', direction: FlowUsSortDirectionEnum.ascending };
          break;
        case FlowUsSortPresetEnum.sortDesc:
          sort = { property: 'sort', direction: FlowUsSortDirectionEnum.descending };
          break;
        case FlowUsSortPresetEnum.sortAsc:
          sort = { property: 'sort', direction: FlowUsSortDirectionEnum.ascending };
          break;
        case FlowUsSortPresetEnum.createTimeDesc:
          sort = {
            property: 'createdAt',
            direction: FlowUsSortDirectionEnum.descending,
          };
          break;
        case FlowUsSortPresetEnum.createTimeAsc:
          sort = {
            property: 'createdAt',
            direction: FlowUsSortDirectionEnum.ascending,
          };
          break;
        case FlowUsSortPresetEnum.updateTimeDesc:
          sort = {
            property: 'updatedAt',
            direction: FlowUsSortDirectionEnum.descending,
          };
          break;
        case FlowUsSortPresetEnum.updateTimeAsc:
          sort = {
            property: 'updatedAt',
            direction: FlowUsSortDirectionEnum.ascending,
          };
          break;
        default:
          sort = {
            property: 'createdAt',
            direction: FlowUsSortDirectionEnum.descending,
          };
      }
    }

    let filter = this.config.filter as FlowUsFilterAndSortParams['filter'];
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

  async getSortedDocList() {
    const pageBlocks = await this.flowus.getDataTableData(this.config.tablePageId);
    let blocks = pageBlocks.blocks;
    const blocksKeys = Object.keys(blocks);
    const tableBlockKey = blocksKeys[0];
    const tableBlock = blocks[tableBlockKey];
    const pageIds = tableBlock.subNodes;
    const { filter, sort } = this.initFilterAndSortParamsParams();
    // 处理 cover 链接
    blocks = await this.flowus.getOssUrl(blocks);
    let filterAndSortDoc = pageIds.map((pageId) => {
      const pageBLock = blocks[pageId];
      const properties = props(pageBLock, tableBlock);
      return {
        id: pageBLock.uuid,
        title: pageBLock.title,
        updated: pageBLock.updatedAt,
        createdAt: pageBLock.createdAt,
        updatedAt: pageBLock.updatedAt,
        properties,
      };
    }) as FlowUsDoc[];
    // 过滤
    filterAndSortDoc = filterDocs(filterAndSortDoc, filter);
    // 排序
    filterAndSortDoc = sortDocs(filterAndSortDoc, sort);
    return filterAndSortDoc;
  }

  /**
   * 获取文档详情
   * @param page
   */
  async getDocDetail(page: FlowUsDoc): Promise<DocDetail> {
    let body = '';
    try {
      const pageBlocks = await this.flowus.getPageBlocks(page.id);
      body = this.f2m.toMarkdownString(pageBlocks);
    } catch (e) {
      this.ctx.warn(`${page.title} 下载出错: ${e.message}`);
      this.ctx.debug(e);
    }
    const doc = {
      id: page.id,
      properties: page.properties,
    };
    let catalog: DocStructure[] | undefined;
    const catalogConfig = this.config.catalog as FlowUsCatalogConfig;
    if (catalogConfig?.enable) {
      // 生成目录
      catalog = genCatalog(doc, catalogConfig.property!);
    }
    return {
      id: page.id,
      properties: page.properties,
      updateTime: page.updated,
      body,
      docStructure: catalog,
      title: page.properties.title,
    };
  }
}
