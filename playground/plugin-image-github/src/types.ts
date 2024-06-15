import { ImageBaseConfig } from '@elogx-test/elog';

export interface ImageGithubConfig extends ImageBaseConfig {
  /** 自定义域名 */
  host?: string;
  /** 路径前缀 */
  prefixKey?: string;
  /** 插件 */
  plugin?: string;
  user: string;
  token: string;
  repo: string;
  branch?: string;
}
