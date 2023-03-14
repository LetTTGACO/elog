/**
 * confluence 配置
 */
export interface ConfluenceConfig {
  user: string
  password: string
  baseUrl: string
  spaceKey: string
  rootPageId: string
}

export interface DeployOptions {
  platform: 'default' | 'confluence'
  needCatalog?: boolean
  postPath?: string
  mdNameFormat?: 'title' | 'urlname'
  adapter?: 'matter-markdown' | 'markdown' | 'html' | 'wiki'
  confluence?: ConfluenceConfig
}

/**
 * // NOTE 语雀官方文档说不稳定
 * 目录详情
 */
export interface TocDetail {
  /** 类型：文章/分组 */
  type: 'DOC' | 'TITLE'
  /** 名称 */
  title: string
  uuid: string
  child_uuid: string
  parent_uuid: string
  slug: string
  depth: number
  level: number
}

/**
 * 文章详情
 */
export interface DocDetail {
  id: string
  doc_id: string
  properties: Properties
  body: string
  updated: number
  title: string
  toc?: TocDetail[]
  body_wiki?: string
}

/**
 * 文章属性
 */
interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}
