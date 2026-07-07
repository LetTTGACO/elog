import { ImageBaseConfig } from '@elog/plugin-sdk';

export interface ImageR2Config extends ImageBaseConfig {
  /** 自定义域名 */
  host: string;
  /** 路径前缀 */
  prefixKey?: string;
  /** 插件 */
  plugin?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region?: string;
}
