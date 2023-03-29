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
  NOTION = 'notion',
}

/**
 * 部署平台
 */
export enum DeployPlatformEnum {
  LOCAL = 'local',
  CONFLUENCE = 'confluence',
}

/**
 * 图床平台
 */
export enum ImagePlatformEnum {
  COS = 'cos',
  OSS = 'oss',
  QINIU = 'qiniu',
  UPYUN = 'upyun',
  GITHUB = 'github',
  LOCAL = 'local',
}
