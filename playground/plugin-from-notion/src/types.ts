import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionSortDirectionEnum, NotionSortPresetEnum } from './const';
import { DocProperties, DocStructure, type FromPluginBaseConfig } from '@elogx-test/elog';

/**
 * 写作平台基础配置
 */
export interface FromPluginBaseOptions {
  /** 是否禁用缓存 */
  disableCache?: boolean;
  /** 缓存文件路径 */
  cacheFilePath?: string;
}

export interface NotionConfig extends FromPluginBaseConfig {
  token: string;
  /** 数据库id */
  databaseId: string;
  filter?: any | boolean;
  sorts?: boolean | NotionSortPresetEnum | NotionSort[];
  catalog?: boolean | NotionCatalogConfig;
  imgToBase64?: boolean;
  /** 下载并发数 */
  limit?: number;
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
