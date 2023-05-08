import { out } from '@elog/shared'
import { FlowUsCatalogConfig, FlowUsConfig, FlowUsDoc } from './types'
import { FlowUsClient as FlowUsApi } from '@flowusx/flowus-client'
import { FlowUsToMarkdown } from '@flowusx/flowus-to-md'
import { DocCatalog, DocDetail } from '@elog/types'
import { genCatalog, props } from './utils'
import asyncPool from 'tiny-async-pool'

class FlowUsClient {
  config: FlowUsConfig
  flowus: FlowUsApi
  f2m: FlowUsToMarkdown
  catalog: FlowUsDoc[] = []

  constructor(config: FlowUsConfig) {
    this.config = config
    this.config.pageId = config.pageId || process.env.FLOWUS_PAGE_ID!
    if (!this.config.pageId) {
      out.err('缺少参数', '缺少 Page ID')
      process.exit(-1)
    }
    this.flowus = new FlowUsApi()
    this.f2m = new FlowUsToMarkdown({ client: this.flowus })
  }

  async getPageList(): Promise<FlowUsDoc[]> {
    const pageBlocks = await this.flowus.getDataTableData(this.config.pageId)
    const blocks = pageBlocks.blocks
    const blocksKeys = Object.keys(blocks)
    const firstKey = blocksKeys[0]
    const firstValue = blocks[firstKey]
    const pageIds = firstValue.subNodes
    const docs = pageIds.map((pageId) => {
      const page = blocks[pageId]
      return {
        id: page.uuid,
        doc_id: page.uuid,
        title: page.title,
        updated: page.updatedAt,
      }
    })
    this.catalog = docs
    return docs
  }

  async download(id: string): Promise<DocDetail> {
    const pageBlocks = await this.flowus.getPageBlocks(id)
    const blocks = pageBlocks.blocks
    const body = this.f2m.toMarkdownString(pageBlocks)
    const properties = props(blocks)
    const pageInfo = blocks[Object.keys(blocks)[0]]
    const doc = {
      id: pageInfo.uuid,
      doc_id: pageInfo.uuid,
      properties,
    }
    let catalog: DocCatalog[] | undefined
    const catalogConfig = this.config.catalog as FlowUsCatalogConfig
    if (catalogConfig?.enable) {
      // 生成目录
      catalog = genCatalog(doc, catalogConfig.property!)
    }
    return {
      ...doc,
      body,
      body_original: body,
      updated: pageInfo.updatedAt,
      catalog,
    }
  }

  async getPageDetailList(cachedPages: FlowUsDoc[], ids: string[]) {
    let articleList: DocDetail[] = []
    let pages: FlowUsDoc[] = cachedPages
    if (ids?.length) {
      // 取交集，过滤不需要下载的page
      pages = pages.filter((page) => {
        const exist = ids.indexOf(page.id) > -1
        if (!exist) {
          const title = page.title
          out.access('跳过下载', title)
        }
        return exist
      })
    }
    if (!pages?.length) {
      out.access('跳过', '没有需要下载的文章')
      return articleList
    }

    const promise = async (page: FlowUsDoc) => {
      let article = await this.download(page.doc_id)
      out.info('下载文档', article.properties.title)
      articleList.push(article)
    }
    await asyncPool(5, pages, promise)
    out.access('已下载数', String(articleList.length))
    return articleList
  }
}

export default FlowUsClient
