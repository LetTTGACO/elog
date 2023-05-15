import { FlowUsConfig, FlowUsDoc } from './types'
import FlowUsClient from './client'
import { BaseDoc } from '@elog/types'
import { out } from '@elog/shared'

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
    out.info('正在获取文档列表，请稍等...')
    const pages = await this.ctx.getPageList()
    this.pages = pages
    out.info('文档总数', String(this.pages.length))
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
