import { ImgConfig } from './img'
import { NotionConfig, YuqueConfig, Doc, DocDetail } from './writing'
import { DeployPlatform, DefaultConfig, WordpressConfig } from './deploy'
import { WritingPlatform } from './writing/common'

interface ElogConfig {
  /** 写作平台 */
  writing: YuqueConfig | NotionConfig
  /** 部署平台 */
  deploy: DefaultConfig
  /** 图片转CDN配置 */
  image?: ImgConfig
  /** 缓存路径 */
  cachePath: string
}

interface CacheJSON {
  docs: DocDetail[]
  catalog: any[]
}

enum DocStatus {
  update = 'update',
  create = 'create',
}

interface DocStatusMap {
  [key: string]: {
    index?: number
    status: DocStatus
  }
}

export {
  ElogConfig,
  ImgConfig,
  WritingPlatform,
  NotionConfig,
  YuqueConfig,
  DeployPlatform,
  DefaultConfig,
  WordpressConfig,
  Doc,
  DocDetail,
  DocStatusMap,
  DocStatus,
  CacheJSON,
}
