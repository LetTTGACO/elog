import type { DocStructure, FromPluginBaseOptions } from '@elogx-test/elog';
import { DocStatus } from './const';

/**
 * @see https://www.yuque.com/yuque/developer/userserializer
 */
export interface YuqueUser {
  /** 用户编号 */
  id: number;
  /** 类型 [`User`  - 用户, Group - 团队] */
  type: 'User' | 'Group';
  /** 用户个人路径 */
  login: string;
  /** 昵称 */
  name: string;
  description: string;
  /** 头像 URL */
  avatar_url: string;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
}

/**
 * @see https://www.yuque.com/yuque/developer/bookserializer
 */
export interface YuqueBook {
  /** 仓库编号 */
  id: number;
  /** 类型 [Book - 文档] */
  type: 'Book';
  /** 仓库路径 */
  slug: string;
  /** 名称 */
  name: string;
  /** 仓库完整路径 user.login/book.slug */
  namespace: string;
  /** 用户/团队编号 */
  user_id: number;
  /** 用户/团队信息 */
  user: YuqueUser;
  /** 介绍 */
  description: string;
  /** 创建人 User Id */
  creator_id: string;
  /** 公开状态 [1 - 公开, 0 - 私密] */
  public: 1 | 0;
  /** 喜欢数量 */
  likes_count: number;
  /** 订阅数量 */
  watches_count: number;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
}

/**
 * @see https://www.yuque.com/yuque/developer/docserializer
 */
export interface YuqueDocDetail {
  /** 文档编号 */
  id: number;
  /** 文档路径 */
  slug: string;
  /** 标题 */
  title: string;
  /** 仓库编号，就是 repo_id */
  book_id: string;
  /** 仓库信息，就是 repo 信息 */
  book: YuqueBook;
  /** 用户/团队编号 */
  user_id: number;
  /** 用户/团队信息 */
  creator: YuqueUser;
  /** 描述了正文的格式 */
  format: 'lake' | 'markdown' | 'laketable' | 'lakesheet' | 'lakeboard';
  /** 封面 */
  cover?: string;
  /** 摘要 */
  description?: string;
  /** 文档标签 */
  tags?: { title: string; created_at: string; updated_at: string }[];
  /** 正文 Markdown 源代码 */
  body: string;
  /** 草稿 Markdown 源代码 */
  body_draft: string;
  /** 转换过后的正文 HTML */
  body_html: string;
  /** 语雀 lake 格式的文档内容 */
  body_lake: string;
  /** 文档创建人 User Id */
  creator_id: string;
  /** 公开级别 [0 - 私密, 1 - 公开] */
  public: 1 | 0;
  /** 状态 [0 - 草稿, 1 - 发布] */
  status: 1 | 0;
  /** 赞数量 */
  likes_count: number;
  /** 评论数量 */
  comments_count: number;
  /** 文档内容更新时间 */
  content_updated_at: Date;
  /** 删除时间 */
  deleted_at: Date | null;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  /** 发布时间 */
  published_at: Date;
  /** 第一次发布时间 */
  first_published_at: Date;
  /** 字数 */
  word_count: number;
}

export interface YuqueDocListResponse {
  meta: {
    total: number;
  };
  data: YuqueDoc[];
}

/** 语雀文档（不带详情）列表返回 */
export interface YuqueDoc {
  cover: null | string;
  custom_description: null;
  description: string;
  draft_version: number;
  last_editor: {
    avatar_url: string;
    created_at: string;
    description: string;
    followers_count: number;
    following_count: number;
    id: number;
    login: string;
    name: string;
    type: string;
    updated_at: string;
  };
  last_editor_id: number;
  read_count: number;
  read_status: number;
  view_status: number;
  /** 文档编号 */
  id: number;
  /** 文档路径 */
  slug: string;
  /** 标题 */
  title: string;
  /** 仓库编号，就是 repo_id */
  book_id: string;
  /** 用户/团队编号 */
  user_id: number;
  /** 描述了正文的格式 */
  format: 'lake' | 'markdown' | 'laketable';
  /** 公开级别 [0 - 私密, 1 - 公开] */
  public: 1 | 0;
  /** 状态 [0 - 草稿, 1 - 发布] */
  status: 1 | 0;
  /** 赞数量 */
  likes_count: number;
  /** 评论数量 */
  comments_count: number;
  /** 文档内容更新时间 */
  content_updated_at: Date;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  /** 发布时间 */
  published_at: Date;
  /** 第一次发布时间 */
  first_published_at: Date;
  /** 字数 */
  word_count: number;
  _index?: number;
  docStructure: DocStructure[];
}

export interface DocStatusMap {
  [key: string]: {
    updateIndex: number;
    status: DocStatus;
  };
}

// region start
export interface YuqueWithPwdConfig extends FromPluginBaseOptions {
  baseUrl?: string;
  username: string;
  password: string;
  login: string;
  repo: string;
  linebreak?: boolean;
  onlyPublic?: boolean;
  /** 下载并发数 */
  limit?: number;
  cache?: {
    enable?: boolean;
    cacheDir: string;
  };
}

export interface YuqueInputConfig {
  token?: YuqueWithTokenConfig;
  pwd?: YuqueWithPwdConfig;
}

export interface YuqueWithTokenConfig extends FromPluginBaseOptions {
  /**
   * yuque token, https://www.yuque.com/settings/tokens
   */
  token: string;
  /** 语雀API 路径，默认https://www.yuque.com/api/v2/ */
  baseUrl?: string;
  login: string;
  repo: string;
  onlyPublic?: boolean;
  /** 下载并发数 */
  limit?: number;
  cache?: {
    enable?: boolean;
    cacheDir: string;
  };
}

// end-region

/** 语雀知识库目录 */
export interface YuqueCatalog {
  /** 类型：文章/分组 */
  type: 'DOC' | 'TITLE';
  title: string;
  uuid: string;
  child_uuid: string;
  parent_uuid: string;
  /** 官方token模式存在 */
  slug: string;
  /** 客户端api模式下存在 */
  url: string;
  /** 官方token模式存在 */
  depth: number;
  /** depth - 1 */
  level: number;
}
