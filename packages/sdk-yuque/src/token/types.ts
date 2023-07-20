import { DocDetail } from '@elog/types'

export type FormatExtConfig = ((doc: DocDetail) => string) | string | boolean
export interface YuqueWithTokenConfig {
  /**
   * yuque token, https://www.yuque.com/settings/tokens
   */
  token: string
  /** 语雀API 路径，默认https://www.yuque.com/api/v2/ */
  baseUrl?: string
  login: string
  repo: string
  onlyPublic?: boolean
  onlyPublished?: boolean
  /** 自定义处理器 */
  formatExt?: FormatExtConfig
}
