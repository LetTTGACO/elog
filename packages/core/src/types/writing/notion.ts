export interface NotionConfig {
  platform: 'notion'
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
