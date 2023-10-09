import { DocProperties } from '@elog/types'

export interface FeiShuConfig {
  folderToken: string
  appId: string
  appSecret: string
  baseUrl?: string
  /** 下载并发数 */
  limit?: number
}

export interface FeiShuDoc {
  id: string
  doc_id: string
  title: string
  updated: number
  properties: DocProperties
  createdAt: number
  updatedAt: number
  _index?: number
  catalog: { title: string; doc_id: string }[]
}
