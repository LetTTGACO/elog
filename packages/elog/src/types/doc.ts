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

export interface DocExt {
  _index: number;
  _status: DocStatus;
  _updateIndex: number;
}

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

export interface FromBaseConfig {
  /** 下载并发数 */
  limit?: number;
}

export interface ImageBaseConfig {
  /** 是否禁用 */
  disable?: boolean;
  /** 自定义域名 */
  host?: string;
  /** 路径前缀 */
  prefixKey?: string;
}

export interface WriteCacheConfig {
  cachedDocList?: Partial<DocDetail>[];
  sortedDocList: DocStructure[];
}

export type SortedDoc<T> = T & { id: string; updateTime: number };
