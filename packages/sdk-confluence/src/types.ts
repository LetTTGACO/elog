export interface ConfluenceConfig {
  user: string
  password: string
  baseUrl: string
  spaceKey: string
  rootPageId: string
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
