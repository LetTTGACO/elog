import { COSOptions } from 'cos-nodejs-sdk-v5';
import { ImageBaseConfig } from '@elogx-test/elog';

export interface ImageCOSInnerConfig extends COSOptions {
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

export type ImageCOSConfig = ImageCOSInnerConfig & ImageBaseConfig;
