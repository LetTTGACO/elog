import type { YuqueDoc } from '../types'
import YuqueClient from './client'
import { BaseDoc } from '@elog/types'
import { out } from '@elog/shared'
import { YuqueWithTokenConfig } from './types'

/**
 * Yuque SDK
 * @class
 */
class YuqueWithToken {
  config: YuqueWithTokenConfig
  ctx: YuqueClient
  pages: YuqueDoc[] = []

  constructor(options: YuqueWithTokenConfig) {
    this.config = options
    this.ctx = new YuqueClient(this.config)
  }

  /**
   * list docs of a repo
   * @return {Promise<DocDetail[]>} return docs
   */
  async getDocList(): Promise<BaseDoc[]> {
    out.info('正在获取文档列表，请稍等...')
    let pages = await this.ctx.getDocList()
    // 过滤未发布和公开的文章
    pages = pages
      .filter((page) => {
        if (page.format === 'laketable') {
          out.warning('跳过下载', `【${page.title}】存在暂不支持的文档格式：数据表`)
        }
        return ['lake', 'markdown'].includes(page.format)
      })
      .filter((page) => {
        return this.config.onlyPublic ? !!page.public : true
      })
      .filter((page) => {
        return this.config.onlyPublished ? !!page.status : true
      })
    this.pages = pages
    out.info('文档总数', String(this.pages.length))
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

export default YuqueWithToken
