/**
 * 部署平台
 */
export enum DeployPlatformEnum {
  LOCAL = 'local',
  CONFLUENCE = 'confluence',
  WORDPRESS = 'wordpress',
  HALO = 'halo',
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
  /** @deprecated 即将1.0废弃 */
  MATTER_MARKDOWN = 'matter-markdown',
  HTML = 'html',
  HTML_HIGHLIGHT = 'html-highlight',
  WIKI = 'wiki',
}

export enum FileExtEnum {
  MARKDOWN = 'md',
  HTML = 'html',
  WIKI = 'wiki',
}

export const fileNameList = Object.values(FileNameEnum)

export const formatList = Object.values(FormatEnum)
