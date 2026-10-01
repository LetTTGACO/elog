import type { TransformPlugin } from '@elog/plugin-contracts';

export interface ToPluginOptions {
  /** 当前目标部署前执行的转换插件。 */
  plugins?: TransformPlugin[];
}

export interface FromPluginBaseConfig {
  disableCache?: boolean;
  cacheFilePath?: string;
  limit?: number;
}
