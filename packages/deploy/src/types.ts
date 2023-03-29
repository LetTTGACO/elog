import { DeployPlatformEnum, FileNameEnum, FormatEnum } from './const'

/**
 * confluence 配置
 */
export interface ConfluenceConfig {
  user: string
  password: string
  baseUrl: string
  spaceKey: string
  rootPageId: string
  plugin?: string
}

/**
 * local 配置
 */
export interface LocalConfig {
  outputDir: string
  filename: FileNameEnum
  format: FormatEnum
  catalog: boolean
  plugin?: string
}

/**
 * 部署配置
 */
type DeployPlatformConfig = { [key in DeployPlatformEnum]: any }
export type DeployConfig = {
  platform: DeployPlatformEnum
} & DeployPlatformConfig

/**
 * // NOTE 语雀官方文档说不稳定
 * 目录详情
 */
export interface CatalogDetail {
  /** 类型：文章/分组 */
  type: 'DOC' | 'TITLE'
  /** 名称 */
  title: string
  uuid: string
  child_uuid: string
  parent_uuid: string
  slug: string
  depth: number
  level: number
}

/**
 * 文章详情
 */
export interface DocDetail {
  id: string
  doc_id: string
  properties: Properties
  body: string
  updated: number
  title: string
  catalog?: CatalogDetail[]
  body_wiki?: string
}

/**
 * 文章属性
 */
interface Properties {
  urlname: string
  title: string
  date: string
  updated: string
  [key: string]: any
}
