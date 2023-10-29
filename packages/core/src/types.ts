import { DocStatus, WritePlatform } from './const'
import { YuqueCatalog, NotionCatalog, DocDetail } from '@elog/types'
import { DeployConfig } from '@elog/deploy'
import { ImageConfig } from '@elog/plugin-image'

/**
 * 写作配置
 */
type WritePlatformConfig = { [key in WritePlatform]: any }
type WriteConfig = {
  platform: WritePlatform
  [key: string]: any
} & WritePlatformConfig

interface ExtConfig {
  /** 缓存路径 */
  cachePath: string
  /** 是否缓存所有属性 */
  isFullCache?: boolean
  /** 是否强制同步，开启后会删除本地文档，慎用 */
  isForced?: boolean
}

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
  /** 拓展配置 */
  extension: ExtConfig
}

// region 文章相关
export interface CacheJSON {
  docs: Partial<DocDetail>[]
  catalog: NotionCatalog[] | YuqueCatalog[]
}

export interface DocStatusMap {
  [key: string]: {
    index?: number
    status: DocStatus
  }
}
// endregion
