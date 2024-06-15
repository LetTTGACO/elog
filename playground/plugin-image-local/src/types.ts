export interface ImageLocalConfig {
  outputDir: string;
  /** 图片统一前缀 */
  prefixKey?: string;
  /** 路径根据文档计算 */
  pathFollowDoc?: {
    enable: boolean;
    docOutputDir: string;
  };
}

export interface ImageUrl {
  url: string;
  originalUrl: string;
}

export interface ImageSource {
  fileName: string;
  originalUrl: string;
  url?: string;
  buffer?: Buffer;
}
