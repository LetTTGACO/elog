import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionSortDirectionEnum, NotionSortPresetEnum } from './const';
import { DocProperties, DocStructure, type FromPluginBaseConfig } from '@elogx-test/elog';

export interface NotionConfig extends FromPluginBaseConfig {
  token: string;
  /** 数据库id */
  databaseId: string;
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
  database_id: string;
  filter?: any;
  sorts?: any;
  start_cursor?: string;
  page_size?: number;
  archived?: boolean;
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
