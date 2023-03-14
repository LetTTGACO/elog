export interface YuqueConfig {
  /**
   * yuque token, https://www.yuque.com/settings/tokens
   */
  token: string
  /** 语雀API 路径，默认https://www.yuque.com/api/v2/ */
  baseUrl?: string
  login: string
  repo: string
  onlyPublic?: boolean
  onlyPublished?: boolean
}

/**
 * @see https://www.yuque.com/yuque/developer/userserializer
 */
export interface UserInfo {
  /** 用户编号 */
  id: number
  /** 类型 [`User`  - 用户, Group - 团队] */
  type: 'User' | 'Group'
  /** 用户个人路径 */
  login: string
  /** 昵称 */
  name: string
  description: string
  /** 头像 URL */
  avatar_url: string
  /** 创建时间 */
  created_at: Date
  /** 更新时间 */
  updated_at: Date
}

/**
 * @see https://www.yuque.com/yuque/developer/bookserializer
 */
export interface BookInfo {
  /** 仓库编号 */
  id: number
  /** 类型 [Book - 文档] */
  type: 'Book'
  /** 仓库路径 */
  slug: string
  /** 名称 */
  name: string
  /** 仓库完整路径 user.login/book.slug */
  namespace: string
  /** 用户/团队编号 */
  user_id: number
  /** 用户/团队信息 */
  user: UserInfo
  /** 介绍 */
  description: string
  /** 创建人 User Id */
  creator_id: string
  /** 公开状态 [1 - 公开, 0 - 私密] */
  public: 1 | 0
  /** 喜欢数量 */
  likes_count: number
  /** 订阅数量 */
  watches_count: number
  /** 创建时间 */
  created_at: Date
  /** 更新时间 */
  updated_at: Date
}

/**
 * @see https://www.yuque.com/yuque/developer/docserializer
 */
export interface DocInfo {
  /** 文档编号 */
  id: number
  /** 文档路径 */
  slug: string
  doc_id: string
  /** 标题 */
  title: string
  /** 仓库编号，就是 repo_id */
  book_id: string
  /** 仓库信息，就是 repo 信息 */
  book: BookInfo
  /** 用户/团队编号 */
  user_id: number
  /** 用户/团队信息 */
  creator: UserInfo
  /** 描述了正文的格式 */
  format: 'lake' | 'markdown'
  /** 正文 Markdown 源代码 */
  body: string
  /** 草稿 Markdown 源代码 */
  body_draft: string
  /** 转换过后的正文 HTML */
  body_html: string
  /** 语雀 lake 格式的文档内容 */
  body_lake: string
  /** 文档创建人 User Id */
  creator_id: string
  /** 公开级别 [0 - 私密, 1 - 公开] */
  public: 1 | 0
  /** 状态 [0 - 草稿, 1 - 发布] */
  status: 1 | 0
  /** 赞数量 */
  likes_count: number
  /** 评论数量 */
  comments_count: number
  /** 文档内容更新时间 */
  content_updated_at: Date
  /** 删除时间 */
  deleted_at: Date | null
  /** 创建时间 */
  created_at: Date
  /** 更新时间 */
  updated_at: Date
  /** 发布时间 */
  published_at: Date
  /** 第一次发布时间 */
  first_published_at: Date
  /** 字数 */
  word_count: number
}

/**
 * // NOTE 官方文档说不稳定
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

export class RequestError extends Error {
  status?: number
  code?: number
  data?: any
}

export interface Doc extends DocInfo {
  properties: Properties
  updated: number
  toc?: TocDetail[]
}

export interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}

export interface BaseDoc {
  id: string
  doc_id: string
  updated: number
}

export type YuQueResponse<T> = {
  data: T
}
