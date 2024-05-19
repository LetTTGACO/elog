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

export interface DocDetail {
  /** 文档唯一 ID */
  id: string;
  /** 文档标题 */
  title: string;
  /** 文档更新时间，时间戳 */
  updateTime: number | string;
  /** 实际部署时的文档字符串 */
  body: string;
  /** 文档属性 */
  properties: DocProperties;
  /** 文档原本的目录信息 */
  docStructure?: DocStructure[];
  /** 文档出错代码，下次同步时会重新下载并同步 */
  error?: number;
  [key: string]: any;
}

export interface BaseConfig {
  /** 是否禁用缓存 */
  disableCache?: boolean;
  /** 缓存文件目录 */
  cacheFilePath?: string;
  /** 下载并发数 */
  limit?: number;
}

export interface WriteCacheConfig {
  cachedDocList?: Partial<DocDetail>[];
  sortedDocList: DocStructure[];
}

export interface DocStatusMap {
  [key: string]: {
    updateIndex: number;
    status: DocStatus;
  };
}

/**
 * 文章更新状态
 */
export enum DocStatus {
  update = 'update',
  create = 'create',
}
