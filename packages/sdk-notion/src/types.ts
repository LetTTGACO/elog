import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { DocProperties, NotionCatalog } from '@elog/types'
import { NotionSortDirectionEnum, NotionSortPresetEnum } from './const'

export interface NotionSort {
  property: string
  direction: NotionSortDirectionEnum
}

export interface NotionCatalogConfig {
  enable: boolean
  property: string
}

export interface NotionConfig {
  token: string
  /** 数据库id */
  databaseId: string
  filter?: any | boolean
  sorts?: boolean | NotionSortPresetEnum | NotionSort[]
  catalog?: NotionCatalogConfig
}

export interface NotionDoc extends PageObjectResponse {
  properties: DocProperties
  catalog: NotionCatalog[]
}
