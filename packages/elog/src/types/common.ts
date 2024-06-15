import { IPlugin } from './plugin';

export type InputOptions = ElogConfig | ElogConfig[];
export interface NormalizeElogOption {
  plugins: IPlugin[];
}

export interface ElogCacheConfig {
  /** 是否禁用缓存 */
  disableCache?: boolean;
  /** 缓存文件目录 */
  cacheFilePath: string;
}
/**
 * elog.config.ts 配置文件
 */
export interface ElogConfig extends ElogCacheConfig {
  /**是否禁用该同步流程 */
  disable?: boolean;
  /** 写作平台 */
  from: IPlugin;
  /** 博客平台 */
  to: IPlugin | IPlugin[];
  /** 处理插件 */
  plugins?: IPlugin[];
}
