/**
 * 文章更新状态
 */
export enum DocStatus {
  update = 'update',
  create = 'create',
}

/**
 * 写作平台
 */
export enum WritePlatform {
  YUQUE = 'yuque',
  /**
   * @deprecated 2023/11/18更新: 语雀官方更新了账号密码登录规则，加上了人机校验，已无法通过Elog 登录！请使用 token 模式
   */
  YUQUE_WITH_PWD = 'yuque-pwd',
  NOTION = 'notion',
  FLOWUS = 'flowus',
  FEISHU = 'feishu',
}
