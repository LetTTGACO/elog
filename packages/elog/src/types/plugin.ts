export type {
  BasePlugin,
  CacheReadonlyContext,
  DeployResult,
  DownloadResult,
  ElogPlugin,
  FromPlugin,
  ImageUtils,
  Logger,
  PluginContext,
  ToPlugin,
  TransformPlugin,
  WorkflowInfo,
} from '../plugins/types';

/** 兼容历史命名：来源插件 download 返回值。 */
export type { DownloadResult as FromPluginReturn, ElogPlugin as IPlugin } from '../plugins/types';

/**
 * 写作平台基础配置，供 from 插件复用缓存和下载并发约束。
 */
export interface FromPluginBaseConfig {
  /** 是否禁用缓存 */
  disableCache?: boolean;
  /** 缓存文件路径 */
  cacheFilePath?: string;
  /** 下载并发数 */
  limit?: number;
}
