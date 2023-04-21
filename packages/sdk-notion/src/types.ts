import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { DocProperties } from '@elog/types'

export const enum NotionSortPreset {
  /** 按自定义日期排序 */
  dateDesc = 'dateDesc',
  dateAsc = 'dateAsc',
  /** 按创建时间排序 */
  createTimeDesc = 'createTimeDesc',
  createTimeAsc = 'createTimeAsc',
  /** 按更新时间排序 */
  updateTimeDesc = 'updateTimeDesc',
  updateTimeAsc = 'updateTimeAsc',
  /** 按sort字段排序 */
  sortDesc = 'sortDesc',
  sortAsc = 'sortAsc',
}

export interface NotionSort {
  property: string
  direction: 'ascending' | 'descending'
}

export interface NotionConfig {
  token: string
  /** 数据库id */
  databaseId: string
  filter?: any | boolean
  sorts?: boolean | NotionSortPreset | NotionSort[]
}

export interface NotionDoc extends PageObjectResponse {
  properties: DocProperties
}
