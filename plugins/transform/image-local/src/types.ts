import type { ImageBaseConfig } from '@elog/cli';

export interface ImageLocalConfig extends ImageBaseConfig {
  outputDir: string;
  /** 图片统一前缀 */
  prefixKey?: string;
  /** 路径根据文档计算 */
  pathFollowDoc?: {
    enable: boolean;
    docOutputDir: string;
  };
}
