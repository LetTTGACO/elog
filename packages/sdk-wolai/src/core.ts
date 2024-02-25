import WoLaiClient from './client'
import { BaseDoc } from '@elog/types'
import { out } from '@elog/shared'
import { WoLaiConfig } from './types'

/**
 * Yuque SDK
 */
class WoLai {
  config: WoLaiConfig
  ctx: WoLaiClient
  pages: any[] = []

  constructor(options: WoLaiConfig) {
    this.config = options
    this.ctx = new WoLaiClient(this.config)
  }

  /**
   * list docs of a repo
   * @return {Promise<DocDetail[]>} return docs
   */
  async getDocList(): Promise<BaseDoc[]> {
    out.info('正在获取文档列表，请稍等...')
    const pages = await this.ctx.getDocList()
    this.pages = pages
    out.info('文档总数', String(this.pages.length))
    return pages.map((page) => {
      // 最后更新时间
      return {
        // 暂时只需要返回这些属性
        id: page.block_id,
        doc_id: page.block_id,
        updated: page.edited_time,
      }
    })
  }

  /**
   * 获取文章详情列表
   * @param ids 需要下载的doc_id列表
   */
  async getDocDetailList(ids: string[]) {
    return await this.ctx.getDocDetailList(this.pages, ids)
  }
}

export default WoLai
