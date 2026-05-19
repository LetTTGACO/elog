import { DocStatus } from '../const';

/** 文章属性 */
export interface DocProperties {
  /** 文档短路径 */
  urlname: string;
  /** 文档标题 */
  title: string;
  /** 文档创建时间，时间戳/字符串 */
  date?: number | string;
  /** 文档更新时间，时间戳/字符串 */
  updated?: number | string;
  [key: string]: any;
}

export interface DocStructure {
  /** 文档唯一 ID */
  id: string;
  /** 文档标题 */
  title: string;
  [key: string]: any;
}

/** 缓存内部扩展字段，记录文档同步状态和更新位置。 */
export interface DocExt {
  _index: number;
  _status: DocStatus;
  _updateIndex: number;
}

/** 文档详情是 transform 和 deploy 阶段共享的核心数据结构。 */
export interface DocDetail {
  /** 文档唯一 ID */
  id: string;
  /** 文档标题 */
  title: string;
  /** 文档更新时间，时间戳 */
  updateTime: number;
  /** 实际部署时的文档字符串 */
  body: string;
  /** 文档属性 */
  properties: DocProperties;
  /** 文档原本的目录信息 */
  docStructure?: DocStructure[];
  [key: string]: any;
}

/** 来源平台列表项只要求具备稳定 id 和更新时间以支持增量同步。 */
export type SortedDoc<T> = T & { id: string; updateTime: number };
