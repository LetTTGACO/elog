import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { DocProperties, DocCatalog } from '@elog/types'
import { NotionSortDirectionEnum, NotionSortPresetEnum } from './const'

export interface NotionSort {
  property: string
  direction: NotionSortDirectionEnum
}

export interface NotionCatalogConfig {
  enable: boolean
  property?: string
}

export interface NotionConfig {
  token: string
  /** 数据库id */
  databaseId: string
  filter?: any | boolean
  sorts?: boolean | NotionSortPresetEnum | NotionSort[]
  catalog?: boolean | NotionCatalogConfig
  imgToBase64?: boolean
  /** 下载文档并发数 */
  limit?: number
}

export interface NotionDoc extends PageObjectResponse {
  properties: DocProperties
  catalog: DocCatalog[]
  _index?: number
}

export interface NotionQueryParams {
  database_id: string
  filter?: any
  sorts?: any
  start_cursor?: string
  page_size?: number
  archived?: boolean
}
