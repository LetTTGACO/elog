export interface DefaultConfig {
  platform: 'default'
  /** 目标文章生成目录 */
  postPath: string
}

export enum DeployPlatform {
  DEFAULT = 'default',
  CONFLUENCE = 'confluence',
}
