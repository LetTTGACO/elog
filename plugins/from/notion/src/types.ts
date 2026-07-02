import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionSortDirectionEnum, NotionSortPresetEnum } from './const';
import { DocProperties, DocStructure, type FromPluginBaseConfig } from '@elog/cli';

export interface NotionConfig extends FromPluginBaseConfig {
  token: string;
  /** 数据源 id；Notion 2025-09-03+ 查询入口。 */
  dataSourceId?: string;
  /** 数据库 id；兼容旧配置，用于换取第一个 data source id。 */
  databaseId?: string;
  filter?: any | boolean;
  sorts?: boolean | NotionSortPresetEnum | NotionSort[];
  catalog?: boolean | NotionCatalogConfig;
  imgToBase64?: boolean;
}

export interface NotionSort {
  property: string;
  direction: NotionSortDirectionEnum;
}

export interface NotionDoc extends PageObjectResponse {
  properties: DocProperties;
  docStructure: DocStructure[];
  _index?: number;
}

export interface NotionQueryParams {
  filter?: any;
  sorts?: any;
  start_cursor?: string;
  page_size?: number;
  in_trash?: boolean;
}

export interface NotionCatalogConfig {
  enable: boolean;
  property?: string;
}

/**
 * 文章更新状态
 */
export enum DocStatus {
  update = 'update',
  create = 'create',
}

export interface DocStatusMap {
  [key: string]: {
    updateIndex: number;
    status: DocStatus;
  };
}
