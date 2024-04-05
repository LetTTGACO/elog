/** 文章属性 */
interface DocProperties {
  /** 文档短路径 */
  urlname: string;
  /** 文档标题 */
  title: string;
  /** 文档创建时间，时间戳/字符串 */
  createTime?: number | string;
  /** 文档更新时间，时间戳/字符串 */
  updateTime?: number | string;
  [key: string]: any;
}

export interface DocDirectoryInfo {
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
  updateTime: number;
  /** 实际部署时的文档字符串 */
  body: string;
  /** 文档属性 */
  properties: DocProperties;
  /** 文档原本的目录信息 */
  directoryInfo: DocDirectoryInfo[];
  /** 文档出错代码，下次同步时会重新下载并同步 */
  error?: number;
}
