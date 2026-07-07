import { Options as OSSOptions } from 'ali-oss';
import { ImageBaseConfig } from '@elog/plugin-sdk';

export interface ImageOSSInnerConfig extends OSSOptions {
  /** 自定义域名 */
  host?: string;
  /** 路径前缀 */
  prefixKey?: string;
  /** 插件 */
  plugin?: string;
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
}

export type ImageOSSConfig = ImageOSSInnerConfig & ImageBaseConfig;
