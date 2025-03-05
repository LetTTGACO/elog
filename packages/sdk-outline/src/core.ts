import type { OutlineDoc, OutlineConfig } from './types'
import OutlineClient from './client'
import { BaseDoc } from '@elog/types'
import { out } from '@elog/shared'

/**
 * Yuque SDK
 * @class
 */
class Outline {
  config: OutlineConfig
  ctx: OutlineClient
  pages: OutlineDoc[] = []

  constructor(options: OutlineConfig) {
    this.config = options
    this.ctx = new OutlineClient(this.config)
  }

  /**
   * list docs of a repo
   * @return {Promise<DocDetail[]>} return docs
   */
  async getDocList(): Promise<BaseDoc[]> {
    out.info('正在获取文档列表，请稍等...')
    let pages = await this.ctx.getDocList()
    pages = pages.filter((page) => {
      if (this.config.isTemplate === true) {
        return page.template === true
      } else if (this.config.isTemplate === false) {
        return !page.template
      } else {
        return true
      }
    })
    this.pages = pages
    out.info('文档总数', String(this.pages.length))
    return pages.map((page) => {
      const timestamp = new Date(page.updatedAt).getTime()
      return {
        // 暂时只需要返回这些属性
        id: page.id,
        doc_id: page.id,
        updated: timestamp,
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

export default Outline
