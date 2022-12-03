export enum WritingPlatform {
  YUQUE = 'yuque',
  NOTION = 'notion',
}

// 文章相关
interface BaseDoc {
  id: string
  doc_id: string
}

export type Doc = BaseDoc & { updated: number }

export interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}
export interface DocDetail extends BaseDoc {
  properties: Properties
  body: string
  updated: number
}
