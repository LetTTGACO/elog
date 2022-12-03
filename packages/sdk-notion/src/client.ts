import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import asyncPool from 'tiny-async-pool'
import { props } from './utils'
import { DocDetail, NotionConfig, NotionPage } from './types'
import { out } from '@elog/shared'

/**
 * Notion SDK
 */
class NotionClient {
  config: NotionConfig
  notion: Client
  n2m: NotionToMarkdown
  constructor(config: NotionConfig) {
    this.config = config
    const token = config.token || process.env.NOTION_TOKEN
    this.notion = new Client({ auth: token })
    this.n2m = new NotionToMarkdown({ notionClient: this.notion })
    // debug(`create client: database_id: ${config.database_id}`)
  }

  /**
   * 获取待发布的文章列表
   */
  async getPageList() {
    let resp = await this.notion.databases.query({
      database_id: this.config.database_id,
      filter: {
        or: [
          {
            property: this.config.status.name,
            select: {
              equals: this.config.status.released,
            },
          },
          {
            property: this.config.status.name,
            select: {
              equals: this.config.status.published,
            },
          },
        ],
      },
    })
    return resp.results as NotionPage[]
  }

  /**
   * 下载一篇文章
   * @param {*} page
   */
  async download(page: NotionPage): Promise<DocDetail> {
    const blocks = await this.n2m.pageToMarkdown(page.id)
    let body = this.n2m.toMarkdownString(blocks)
    let properties = props(page)
    const timestamp = new Date(page.last_edited_time).getTime()
    return {
      id: page.id,
      doc_id: page.id,
      properties,
      body,
      updated: timestamp,
    }
  }

  /**
   * 获取文章列表
   * @param cachedPages 已经下载过的pages
   * @param ids 需要下载的doc_id列表
   */
  async getPageDetailList(cachedPages?: NotionPage[], ids?: string[]) {
    // 获取待发布的文章
    let articleList: DocDetail[] = []
    let pages: NotionPage[]
    if (cachedPages) {
      pages = cachedPages
    } else {
      pages = await this.getPageList()
    }
    if (ids?.length) {
      // 取交集，过滤不需要下载的page
      pages = pages.filter((page) => {
        const exist = ids.indexOf(page.id) > -1
        if (!exist) {
          // @ts-ignore
          const title = page.properties?.title?.title.map((a: any) => a.plain_text).join('') || ''
          out.access('跳过下载', title)
        }
        return exist
      })
    }
    if (!pages?.length) {
      out.access('跳过', '没有需要下载的文章')
      return articleList
    }
    const promise = async (page: NotionPage) => {
      let article = await this.download(page)
      out.info('文章下载', article.properties.title)
      await this.published(page)
      articleList.push(article)
    }
    await asyncPool(5, pages, promise)
    out.access('已下载数', String(articleList.length))
    return articleList
  }

  /**
   * 修改notion的状态
   * @param page
   */
  async published(page: NotionPage) {
    let props = page.properties as any
    // 将待发布改为已发布
    if (props[this.config.status.name].select.name === this.config.status.released) {
      props[this.config.status.name].select = { name: this.config.status.published }
      await this.notion.pages.update({
        page_id: page.id,
        properties: props,
      })
    }
  }
}

export default NotionClient
