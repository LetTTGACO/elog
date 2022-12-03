export interface YuqueConfig {
  platform: 'yuque'
  /** 语雀TOKEN */
  token: string
  /** 语雀 login (group), 也称为个人路径 */
  login: string
  /** 语雀仓库短名称，也称为语雀知识库路径 */
  repo: string
  /** 只下载公开文章 */
  onlyPublic?: boolean
  /** 只下载已经发布的文章 */
  onlyPublished?: boolean
}
