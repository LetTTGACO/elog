import { ImgConfig } from './img'
import { NotionConfig, YuqueConfig, Doc, DocDetail } from './writing'
import { DeployPlatform, DefaultConfig, WordpressConfig } from './deploy'
import { WritingPlatform } from './writing/common'

interface ElogConfig {
  /** 写作平台 */
  writing: YuqueConfig | NotionConfig
  /** 部署平台 */
  deploy: DefaultConfig
  /** 具体配置文件 */
  /** 下载文章并发数，默认5 */
  concurrency?: number
  /** 缓存文件路径 */
  articleCachePath?: string
  /** 增量更新文件路径 */
  lastGeneratePath?: string
  /** 图片转CDN配置 */
  image?: ImgConfig
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
}
