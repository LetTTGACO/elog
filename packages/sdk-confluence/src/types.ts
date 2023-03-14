export interface ConfluenceConfig {
  user: string
  password: string
  baseUrl: string
  spaceKey: string
  rootPageId: string
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

export interface Expandable {
  children: string
  container: string
  descendants: string
  history: string
  metadata: string
  operations: string
  restrictions: string
  space: string
  version: string
}

export interface Links {
  base: string
  collection: string
  context: string
  edit: string
  self: string
  tinyui: string
  webui: string
}

export interface Ancestor {
  _expandable: AncestorExpandable
  _links: AncestorLinks
  extensions: AncestorExtensions
  id: string
  status: string
  title: string
  type: string
}

export interface AncestorExpandable {
  ancestors: string
  body: string
  children: string
  container: string
  descendants: string
  history: string
  metadata: string
  operations: string
  restrictions: string
  space: string
  version: string
}

export interface AncestorLinks {
  edit: string
  self: string
  tinyui: string
  webui: string
}

export interface AncestorExtensions {
  position: string
}

export interface Body {
  _expandable: BodyExpandable
  storage: Storage
  view: View
}

export interface BodyExpandable {
  anonymous_export_view: string
  editor: string
  export_view: string
  styled_view: string
}

export interface Storage {
  _expandable: StorageExpandable
  representation: string
  value: string
}

export interface StorageExpandable {
  content: string
}

export interface View {
  _expandable: ViewExpandable
  representation: string
  value: string
}

export interface ViewExpandable {
  content: string
  webresource: string
}

/**
 * Page详情
 */
export interface WikiPageDetail {
  _expandable: Expandable
  _links: Links
  ancestors: Ancestor[]
  body: Body
  id: string
  status: string
  title: string
  type: string
  version: {
    number: number
  }
}

export interface WikiPageList {
  _links: Links
  limit: number
  results: WikiPageDetail[]
  size: number
  start: number
}

export interface WikiMap {
  [name: string]: {
    id: string
    status: string
    title: string
    type: string
  }
}

export interface WikiContent {
  id: string
  status: string
  title: string
  type: string
}

export interface WikiPageListResponse {
  results: {
    content: WikiContent
  }[]
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
