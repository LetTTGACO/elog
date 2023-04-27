export interface BaseDoc {
  /** 文章唯一ID */
  id: string
  /** 文章ID */
  doc_id: string
  /** 更新时间，冗余字段 */
  updated: number
}

/** 文章属性 */
export interface DocProperties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}

/** 语雀知识库目录 */
export interface YuqueCatalog {
  /** 类型：文章/分组 */
  type: 'DOC' | 'TITLE'
  title: string
  uuid: string
  child_uuid: string
  parent_uuid: string
  slug: string
  depth: number
  level: number
}

/** 语雀文档目录 */
export interface YuqueDocCatalog {
  title: string
  doc_id: string
}

/** Notion目录 */
export interface NotionCatalog {
  properties: DocProperties
  parent: any
  object: 'page'
  id: string
  created_time: string
  last_edited_time: string
  archived: boolean
  url: string
  [key: string]: any
}

/** Notion文档目录 */
export interface NotionDocCatalog {
  title: string
  doc_id: string
}

/** 文章详情 */
export interface DocDetail extends BaseDoc {
  /** 实际部署时的文档字符串 */
  body: string
  /** 原始文档字符串 */
  body_original: string
  /** 部署到wiki时会存在 */
  body_wiki?: string
  /** html字符串 */
  body_html?: string
  /** 文章属性 */
  properties: DocProperties
  /** 文章目录路径 */
  catalog?: YuqueDocCatalog[] | NotionDocCatalog[]
}
