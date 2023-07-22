import { out } from '@elog/shared'
import path from 'path'
import {
  htmlAdapter,
  markdownAdapter,
  matterMarkdownAdapter,
  wikiAdapter,
} from '@elog/plugin-adapter'
import { AdapterConfig, AdapterFunction } from '../types'
import { FormatEnum, formatList } from '../const'

/**
 * 文档处理适配器
 */
export class AdapterClient {
  config: AdapterConfig
  ctx: AdapterFunction

  constructor(config: AdapterConfig) {
    this.config = config
    this.ctx = this.initAdapter()
  }

  /**
   * 初始化适配器
   * @private
   */
  private initAdapter() {
    if (this.config.formatExt) {
      out.warning('注意', '正在加载文档处理拓展点，请遵循文档处理拓展点注入规范')
      try {
        // 加载拓展点
        // 如果指定了secret拓展点，那么拓展点返回的账号密码信息，将会覆盖elog-config.json中的image信息
        const formatExtPath = path.resolve(process.cwd(), this.config.formatExt)
        // 拓展点需要暴露format方法
        const { format } = require(formatExtPath)
        return format
      } catch (e: any) {
        out.err('文档处理拓展点加载失败，请检查！', e.message)
        out.debug(e.message)
        process.exit(1)
      }
    } else {
      switch (this.config.format) {
        case FormatEnum.MARKDOWN:
          return markdownAdapter
        case FormatEnum.MATTER_MARKDOWN:
          return matterMarkdownAdapter
        case FormatEnum.WIKI:
          return wikiAdapter
        case FormatEnum.HTML:
          return htmlAdapter
        default:
          out.warning(`目前只支持将文档转换为${formatList.toString()}，将默认以markdown形式转换`)
          return markdownAdapter
      }
    }
  }

  /**
   * 获取文档处理器
   */
  public getAdapter() {
    return this.ctx
  }
}
