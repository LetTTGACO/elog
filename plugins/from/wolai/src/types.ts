import { WolaiSortPresetEnum } from './const';
import { DocProperties, FromPluginBaseConfig } from '@elogx-test/elog';
export interface WoLaiConfig extends FromPluginBaseConfig {
  token: string;
  /** 文档ID */
  pageId: string;
  /** 是否启用目录 */
  catalog?: WoLaiCatalogConfig | boolean;
  /** API域名 */
  baseUrl?: string;
  /** 并发限制 */
  limit?: number;
  filter?: WolaiFilter;
  sort?: WolaiSort;
}

export interface WolaiFilterItem {
  property: string;
  value: string;
}

export interface WolaiSortItem {
  property: string;
  direction: string;
}

export type WolaiFilter = boolean | WolaiFilterItem | WolaiFilterItem[];
export type WolaiSort = boolean | WolaiSortPresetEnum | WolaiSortItem;
export interface WolaiFilterAndSortParams {
  filter?: WolaiFilterItem | WolaiFilterItem[];
  sort?: WolaiSortItem;
}
/**
 * 文档块值
 */
export interface WoLaiDocBlockValue {
  active: boolean;
  attributes: {
    page_view: boolean;
    title: Array<string[]>;
  };
  block_discuss_ids: string[];
  created_by: string;
  created_time: number;
  database_id: string;
  edited_by: string;
  edited_time: number;
  id: string;
  page_id: string;
  parent_id: string;
  parent_type: string;
  resolved_discuss_ids: string[];
  status: number;
  sub_nodes: string[];
  tableviews: string[];
  teamspace_id: string;
  type: string;
  version: number;
  view_count: number;
  workspace_id: string;
}

/**
 * 文档块
 */
export interface WoLaiDocBlock {
  active: boolean;
  isPublic: boolean;
  role: string;
  value: WoLaiDocBlockValue;
}

export interface WoLaiDatabaseTables {
  [key: string]: WoLaiDatabaseTable;
}

export interface WoLaiDatabaseTablePropertyOption {
  option_id: string;
  property_id: string;
  value: string;
  color: string;
}

export interface WoLaiDatabaseTableProperty {
  column_color: string;
  fill_title_background_color: boolean;
  fill_with_default_value: boolean;
  id: string;
  name: string;
  options: WoLaiDatabaseTablePropertyOption[];
  type: string;
  visibility: string;
}
export interface WoLaiDatabaseTable {
  color: string;
  option_id: string;
  property_id: string;
  value: string;
}

export interface WoLaiDatabaseTable {
  _id: string;
  block_id: string;
  created_by: string;
  created_time: string;
  edited_by: string;
  edited_time: string;
  last_edit_time: string;
  last_edit_user: string;
  properties: WoLaiDatabaseTableProperty[];
  release: number;
  rows_count: number;
  space_id: string;
  status: number;
  table_id: string;
  templates: string[];
  version: number;
}

export interface WoLaiTablePage {
  block: {
    [key: string]: WoLaiDocBlock;
  };
  database_tables: WoLaiDatabaseTables;
}

export interface WoLaiTableRow {
  _id: string;
  block_id: string;
  created_by: string;
  created_time: number;
  edited_by: string;
  edited_time: number;
  properties: {
    [key: string]: any[][];
  };
  status: number;
  table_id: string;
  template: boolean;
  version: number;
}

export interface WoLaiDoc extends WoLaiTableRow {
  id: string;
  _index?: number;
  createdAt: number;
  updatedAt: number;
  properties: DocProperties;
}

export interface WoLaiTableRows {
  blocks: WoLaiDocBlock[];
  rows: WoLaiTableRow[];
}

export interface WoLaiCatalogConfig {
  enable: boolean;
  property?: string;
}
