import { FlowUsConfig, FlowUsDoc } from './types'
import FlowUsClient from './client'
import { BaseDoc } from '@elog/types'

class FlowUs {
  config: FlowUsConfig
  ctx: FlowUsClient
  pages: FlowUsDoc[] = []

  constructor(config: FlowUsConfig) {
    this.config = config
    this.ctx = new FlowUsClient(config)
  }

  /**
   * 获取文章列表（不含详情）
   */
  async getDocList(): Promise<BaseDoc[]> {
    const pages = await this.ctx.getPageList()
    this.pages = pages
    return pages.map((page) => {
      return {
        // 暂时只需要返回这些属性
        id: page.id,
        doc_id: page.id,
        updated: page.updated,
      }
    })
  }

  /**
   * 获取文章详情列表
   * @param ids 需要下载的doc_id列表
   */
  async getDocDetailList(ids: string[]) {
    return await this.ctx.getPageDetailList(this.pages, ids)
  }
}

export default FlowUs
