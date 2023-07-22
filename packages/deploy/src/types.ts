import { DeployPlatformEnum, FileNameEnum, FormatEnum } from './const'
import { DocDetail } from '@elog/types'

/**
 * local 配置
 */
export interface LocalConfig {
  outputDir: string
  filename: FileNameEnum
  format: FormatEnum
  catalog: boolean
  formatExt?: string
}

/**
 * 部署配置
 */
type DeployPlatformConfig = { [key in DeployPlatformEnum]: any }
export type DeployConfig = {
  platform: DeployPlatformEnum
} & DeployPlatformConfig

/** 文档处理适配器 */
export interface AdapterConfig {
  format: FormatEnum
  formatExt?: string
}

export type AdapterFunction = (doc: DocDetail) => string

export interface DocMap<T> {
  [key: string]: T
}
