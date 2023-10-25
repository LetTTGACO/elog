import { DocProperties } from '@elog/types'

export interface FeiShuConfig {
  /** 知识库/我的空间 */
  type: 'wiki' | 'space'
  /** 父文件夹token */
  folderToken?: string
  /** 知识库 ID */
  wikiId?: string
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
