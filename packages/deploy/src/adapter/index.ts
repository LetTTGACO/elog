import { getPackage } from '@elog/shared'
import {
  htmlAdapter,
  htmlAdapterWithHighlight,
  markdownAdapter,
  matterMarkdownAdapter,
  wikiAdapter,
} from '@elog/plugin-adapter'
import { AdapterConfig, AdapterFunction } from '../types'
import { FileExtEnum, FormatEnum } from '../const'

/**
 * 文档处理适配器
 */
export class AdapterClient {
  config: AdapterConfig
  ctx: AdapterFunction
  fileExt: string = FileExtEnum.MARKDOWN

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
          this.fileExt = FileExtEnum.MARKDOWN
          if (this.config.frontMatter?.enable) {
            return matterMarkdownAdapter
          }
          return markdownAdapter
        }
        case FormatEnum.MATTER_MARKDOWN:
          this.fileExt = FileExtEnum.MARKDOWN
          return matterMarkdownAdapter
        case FormatEnum.WIKI:
          this.fileExt = FileExtEnum.WIKI
          return wikiAdapter
        case FormatEnum.HTML:
          this.fileExt = FileExtEnum.HTML
          return htmlAdapter
        case FormatEnum.HTML_HIGHLIGHT:
          this.fileExt = FileExtEnum.HTML
          return htmlAdapterWithHighlight
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

  /**
   * 获取文件后缀
   */
  public getFileExt() {
    return this.fileExt
  }
}
