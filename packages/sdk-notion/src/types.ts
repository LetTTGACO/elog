import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export interface NotionConfig {
  token: string
  /** 数据库id */
  database_id: string
  /** 状态字段 */
  status: {
    // 字段名称
    name: string
    // 已发布
    published: string
    // 待发布
    released: string
  }
}

interface BaseDoc {
  id: string
  doc_id: string
  updated: number
}

export interface DocDetail extends BaseDoc {
  properties: Properties
  body: string
}

export type Doc = BaseDoc

export type NotionPage = PageObjectResponse

export interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}
