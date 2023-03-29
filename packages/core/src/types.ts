import { DeployPlatformEnum, DocStatus, ImagePlatformEnum, WritePlatform } from './const'

/**
 * 写作配置
 */
type WritePlatformConfig = { [key in WritePlatform]: any }
type WriteConfig = {
  platform: WritePlatform
  [key: string]: any
} & WritePlatformConfig

/**
 * 部署配置
 */
type DeployPlatformConfig = { [key in DeployPlatformEnum]: any }
type DeployConfig = {
  platform: DeployPlatformEnum
} & DeployPlatformConfig

/**
 * 图床配置
 */
type ImagePlatformConfig = { [key in ImagePlatformEnum]: any }
type ImageConfig = {
  enable: boolean
  bed: ImagePlatformEnum
} & ImagePlatformConfig

/**
 * Elog 配置
 */
export interface ElogConfig {
  /** 写作平台 */
  write: WriteConfig
  /** 部署平台 */
  deploy: DeployConfig
  /** 图片转CDN配置 */
  image?: ImageConfig
  /** 缓存路径 */
  cachePath: string
}

// region 文章相关
interface BaseDoc {
  id: string
  doc_id: string
}

export type Doc = BaseDoc & { updated: number }

export interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}
export interface DocDetail extends BaseDoc {
  properties: Properties
  body: string
  updated: number
}

export interface CacheJSON {
  docs: DocDetail[]
  catalog: any[]
}

export interface DocStatusMap {
  [key: string]: {
    index?: number
    status: DocStatus
  }
}
// endregion
