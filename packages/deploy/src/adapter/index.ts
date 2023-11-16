import { getPackage } from '@elog/shared'
import {
  htmlAdapter,
  markdownAdapter,
  matterMarkdownAdapter,
  wikiAdapter,
} from '@elog/plugin-adapter'
import { AdapterConfig, AdapterFunction } from '../types'
import { FormatEnum } from '../const'

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
      const { format } = getPackage(this.config.formatExt)
      return format
    } else {
      switch (this.config.format) {
        case FormatEnum.MARKDOWN: {
          if (this.config.frontMatter?.enable) {
            return matterMarkdownAdapter
          }
          return markdownAdapter
        }
        case FormatEnum.MATTER_MARKDOWN:
          return matterMarkdownAdapter
        case FormatEnum.WIKI:
          return wikiAdapter
        case FormatEnum.HTML:
          return htmlAdapter
        default:
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
