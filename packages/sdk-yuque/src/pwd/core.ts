import type { YuqueDoc } from '../types'
import YuqueClient from './client'
import { BaseDoc } from '@elog/types'
import { out } from '@elog/shared'
import { YuqueWithPwdConfig } from './types'

/**
 * Yuque SDK
 * @class
 */
class YuqueWithPwd {
  config: YuqueWithPwdConfig
  ctx: YuqueClient
  pages: YuqueDoc[] = []

  constructor(options: YuqueWithPwdConfig) {
    this.config = options
    this.ctx = new YuqueClient(this.config)
  }

  /**
   * 登陆语雀
   */
  async login() {
    await this.ctx.login()
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

export default YuqueWithPwd
