interface BaseDoc {
  id: string
  doc_id: string
}

export interface DocDetail extends BaseDoc {
  properties: Properties
  body: string
}

export type Doc = BaseDoc

export interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}
