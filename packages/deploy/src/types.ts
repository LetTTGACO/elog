export interface DeployOptions {
  classify?: string
  postPath: string
  lastGenerate?: number
  mdNameFormat?: 'title' | 'urlname'
  adapter?: 'matter-markdown' | 'markdown' | 'html' | any
}

export interface DocDetail {
  id: string
  doc_id: string
  properties: Properties
  body: string
  updated: number
}
interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}
