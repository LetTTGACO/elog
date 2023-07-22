/**
 * 部署平台
 */
export enum DeployPlatformEnum {
  LOCAL = 'local',
  CONFLUENCE = 'confluence',
  WORDPRESS = 'wordpress',
}

/**
 * 本地部署相关
 */
export enum FileNameEnum {
  TITLE = 'title',
  URLNAME = 'urlname',
}
export enum FormatEnum {
  MARKDOWN = 'markdown',
  MATTER_MARKDOWN = 'matter-markdown',
  HTML = 'html',
  WIKI = 'wiki',
}

export const fileNameList = Object.values(FileNameEnum)

export const formatList = Object.values(FormatEnum)
