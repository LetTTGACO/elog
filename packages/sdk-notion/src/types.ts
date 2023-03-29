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

export type NotionPage = PageObjectResponse
