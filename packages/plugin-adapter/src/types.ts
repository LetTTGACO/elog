export interface DocDetail {
  properties: Properties
  body: string
}

export interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}
