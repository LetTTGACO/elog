import { DocDetail, DocProperties } from '@elog/types'

export type OutlineResponse<T> = {
  data: T
  message?: string
}

export interface OutlineDocListResponse {
  pagination: {
    total: number
  }
  data: OutlineDoc[]
}

/** 语雀文档（不带详情）列表返回 */
export interface OutlineDoc {
  /**
   * The date and time that this object was archived
   */
  archivedAt?: string
  /**
   * Identifier for the associated collection.
   */
  collectionId?: string
  /**
   * The date and time that this object was created
   */
  createdAt: string
  /**
   * The date and time that this object was deleted
   */
  deletedAt?: string | null
  /**
   * An emoji associated with the document.
   */
  emoji?: string
  /**
   * Whether this document should be displayed in a full-width view.
   */
  fullWidth?: boolean
  /**
   * Unique identifier for the object.
   */
  id: string
  /**
   * Identifier for the document this is a child of, if any.
   */
  parentDocumentId?: string
  /**
   * Whether this document is pinned in the collection
   */
  pinned?: boolean
  /**
   * The date and time that this object was published
   */
  publishedAt?: string | null
  /**
   * A number that is auto incrementing with every revision of the document that is saved
   */
  revision?: number
  /**
   * Whether this document is a template
   */
  template?: boolean
  /**
   * Unique identifier for the template this document was created from, if any
   */
  templateId?: string
  /**
   * The text content of the document, contains markdown formatting
   */
  text: string
  /**
   * The title of the document.
   */
  title: string
  /**
   * The date and time that this object was last changed
   */
  updatedAt: string
  /**
   * A short unique ID that can be used to identify the document as an alternative to the UUID
   */
  urlId: string
  // [property: string]: any

  _index?: number
}

export type DocUnite = DocDetail & OutlineDoc

export interface GetProps {
  body: string
  properties: DocProperties
}

export interface OutlineConfig {
  token: string
  /** API 路径 */
  baseUrl?: string
  /** 文档集ID */
  collectionId?: string
  /** 用户 ID */
  userId?: string
  /** 反向链接文档编号 */
  backlinkDocumentId?: string
  /** 父文档ID */
  parentDocumentId?: string
  /** 是否为模版 */
  isTemplate?: boolean
  /** 下载并发数 */
  limit?: number
}
