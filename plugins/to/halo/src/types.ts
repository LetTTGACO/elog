import type { ToPluginOptions } from '@elog/plugin-sdk';

/**
 * local 配置
 */
export interface HaloConfig extends ToPluginOptions {
  /** Halo站点地址 */
  endpoint: string;
  /** Halo个人令牌 */
  token: string;
}
