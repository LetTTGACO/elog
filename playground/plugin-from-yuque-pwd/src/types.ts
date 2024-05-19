import type { DocStructure, FromPluginBaseConfig } from '@elogx-test/elog';

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

export type YuqueInputConfig = Partial<YuqueWithPwdConfig>;

export interface YuqueWithPwdConfig extends FromPluginBaseConfig {
  baseUrl?: string;
  username: string;
  password: string;
  login: string;
  repo: string;
  linebreak?: boolean;
  onlyPublic?: boolean;
  /** 下载并发数 */
  limit?: number;
}

/** 语雀知识库目录 */
export interface YuqueCatalog {
  /** 类型：文章/分组 */
  type: 'DOC' | 'TITLE';
  title: string;
  uuid: string;
  child_uuid: string;
  parent_uuid: string;
  /** 客户端api模式下存在 */
  url: string;
  /** depth - 1 */
  level: number;
}
