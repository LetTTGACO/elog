import { DeployPlatformEnum, FileNameEnum, FormatEnum } from './const'
import { DocDetail } from '@elog/types'
import { HaloConfig } from '@elog/sdk-halo'

/**
 * local 配置
 */
export interface LocalConfig {
  outputDir: string
  filename: FileNameEnum
  format: FormatEnum
  catalog: boolean
  formatExt?: string | Function
  frontMatter?: {
    enable?: boolean
    exclude?: string[]
    include?: string[]
  }
}

export interface IHaloConfig extends HaloConfig {
  formatExt?: string
  rowType?: string
  needUploadImage?: boolean
  /** 是否启用替换 html 中的 img 标签 */
  enableReplaceImgInHtml?: boolean
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
  formatExt?: string | Function
  frontMatter?: {
    enable?: boolean
    exclude?: string[]
    include?: string[]
  }
}

export type AdapterFunction = (
  doc: DocDetail,
  imageClient?: any,
) => DocDetail | string | Promise<DocDetail>

export interface DocMap<T> {
  [key: string]: T
}
