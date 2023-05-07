export interface FlowUsCatalogConfig {
  enable: boolean
  property?: string
}

export interface FlowUsConfig {
  pageId: string
  catalog?: boolean | FlowUsCatalogConfig
}

export interface FlowUsDoc {
  id: string
  doc_id: string
  title: string
  updated: number
}
