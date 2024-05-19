import { FlowUsSortPresetEnum } from './const';
import { DocProperties, FromPluginBaseConfig } from '@elogx-test/elog';

export interface FlowUsCatalogConfig {
  enable: boolean;
  property?: string;
}

export interface FlowUsFilterItem {
  property: string;
  value: string;
}

export interface FlowUsSortItem {
  property: string;
  direction: string;
}

export interface FlowUsFilterAndSortParams {
  filter?: FlowUsFilterItem | FlowUsFilterItem[];
  sort?: FlowUsSortItem;
}

export type FlowUsFilter = boolean | FlowUsFilterItem | FlowUsFilterItem[];
export type FlowUsSort = boolean | FlowUsSortPresetEnum | FlowUsSortItem;

export interface FlowUsConfig extends FromPluginBaseConfig {
  tablePageId: string;
  filter?: FlowUsFilter;
  sort?: FlowUsSort;
  catalog?: boolean | FlowUsCatalogConfig;
}

export interface FlowUsDoc {
  id: string;
  title: string;
  updated: number;
  properties: DocProperties;
  createdAt: number;
  updatedAt: number;
  _index?: number;
}
