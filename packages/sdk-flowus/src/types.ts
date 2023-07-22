import { FlowUsSortPresetEnum } from './const'
import { DocProperties } from '@elog/types'

export interface FlowUsCatalogConfig {
  enable: boolean
  property?: string
}

export interface FlowUsFilterItem {
  property: string
  value: string
}

export interface FlowUsSortItem {
  property: string
  direction: string
}

export type FlowUsFilter = boolean | FlowUsFilterItem | FlowUsFilterItem[]
export type FlowUsSort = boolean | FlowUsSortPresetEnum | FlowUsSortItem

export interface FlowUsConfig {
  tablePageId: string
  filter?: FlowUsFilter
  sort?: FlowUsSort
  catalog?: boolean | FlowUsCatalogConfig
  /** 下载并发数 */
  limit?: number
}

export interface FlowUsDoc {
  id: string
  doc_id: string
  title: string
  updated: number
  properties: DocProperties
  createdAt: number
  updatedAt: number
  _index?: number
}

export interface FlowUsFilterAndSortParams {
  filter?: FlowUsFilterItem | FlowUsFilterItem[]
  sort?: FlowUsSortItem
}
