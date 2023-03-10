import type { YuqueConfig } from './types'
import { BaseDoc, DocInfo } from './types'
import YuqueClient from './client'

/**
 * Yuque SDK
 * @class
 */
class Yuque {
  config: YuqueConfig
  ctx: YuqueClient
  pages: DocInfo[] = []

  constructor(options: YuqueConfig) {
    this.config = options
    this.ctx = new YuqueClient(this.config)
  }

  /**
   * list docs of a repo
   * @return {Promise<DocInfo[]>} return docs
   */
  async getDocList(): Promise<BaseDoc[]> {
    let pages = await this.ctx.getDocList()
    // 过滤未发布和公开的文章
    pages = pages
      .filter((page) => {
        return this.config.onlyPublic ? !!page.public : true
      })
      .filter((page) => {
        return this.config.onlyPublished ? !!page.status : true
      })
    this.pages = pages
    return pages.map((page) => {
      const timestamp = new Date(page.updated_at).getTime()
      return {
        // 暂时只需要返回这些属性
        id: String(page.id),
        doc_id: page.slug,
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

export default Yuque
