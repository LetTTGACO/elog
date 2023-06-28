import { FormatExtConfig, FormatExtFunction } from './types'
import { out } from '@elog/shared'
import path from 'path'
import { noProcess, processWordWrap } from './utils'

/**
 * 自定义处理器
 */
export class FormatExt {
  formatExt?: FormatExtConfig = true
  ctx: FormatExtFunction

  constructor(config?: FormatExtConfig) {
    this.formatExt = config
    this.ctx = this.initFormatExt()
  }

  /**
   * 初始化适配器
   * @private
   */
  private initFormatExt(): FormatExtFunction {
    if (typeof this.formatExt === 'boolean') {
      if (this.formatExt) {
        // 开启默认处理逻辑
        return processWordWrap
      } else {
        // 不处理
        return noProcess
      }
    } else if (typeof this.formatExt === 'string') {
      out.warning('注意', '正在加载文档处理拓展点，请遵循文档处理拓展点注入规范')
      try {
        // 加载拓展点
        const formatExtPath = path.resolve(process.cwd(), this.formatExt)
        // 拓展点需要暴露format方法
        const { format } = require(formatExtPath)
        return format
      } catch (e: any) {
        out.err(e.message)
        out.err('文档处理拓展点加载失败，请检查！')
        process.exit(1)
      }
    } else if (typeof this.formatExt === 'function') {
      return this.formatExt
    } else {
      out.warning('文档处理拓展点配置错误，将使用默认逻辑')
      return processWordWrap
    }
  }

  /**
   * 获取文档处理器
   */
  public getFormatExt() {
    return this.ctx
  }
}
