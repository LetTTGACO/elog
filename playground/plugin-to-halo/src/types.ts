/**
 * local 配置
 */
export interface HaloConfig {
  /** Halo站点地址 */
  endpoint: string;
  /** Halo个人令牌 */
  token: string;
  /** 存储策略名称 */
  policyName?: string;
  /** 组名称 */
  groupName?: string;
  needUploadImage?: boolean;
  rowType?: string;
}
