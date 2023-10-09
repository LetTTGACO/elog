import { out } from '@elog/shared'
import { FeiShuConfig, FeiShuDoc } from './types'
import { FeiShuClient as FeiShuApi } from '@feishux/api'
import { IFolderData } from '@feishux/shared'
import { FeiShuToMarkdown } from '@feishux/doc-to-md'
import { DocDetail } from '@elog/types'
import asyncPool from 'tiny-async-pool'
import { getProps } from './utils'

class FeiShuClient {
  config: FeiShuConfig
  feishu: FeiShuApi
  f2m: FeiShuToMarkdown
  catalog: Omit<FeiShuDoc, 'properties'>[] = []

  constructor(config: FeiShuConfig) {
    this.config = config
    this.config.folderToken = config.folderToken || process.env.FEISHU_FOLDER_TOKEN!
    this.config.appId = config.appId || process.env.FEISHU_APP_ID!
    this.config.appSecret = config.appSecret || process.env.FEISHU_APP_SECRET!
    if (!this.config.folderToken) {
      out.err('缺少参数', '缺少目标文件夹Token')
      process.exit(-1)
    }
    this.feishu = new FeiShuApi({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      baseUrl: this.config.baseUrl,
    })
    this.f2m = new FeiShuToMarkdown({ client: this.feishu })
  }

  async getPageList(): Promise<FeiShuDoc[]> {
    const tree = await this.feishu.getFolderTree(this.config.folderToken)
    const self = this

    // 深度优先遍历tree
    function dfs(tree: IFolderData[], catalog = [], level = 0) {
      tree.map((item) => {
        const newCatalog = [...catalog, { title: item.name, doc_id: item.token }]
        if (item.type === 'docx') {
          self.catalog.push({
            id: item.token,
            doc_id: item.token,
            title: item.name,
            updated: Number(item.modified_time + '000'),
            createdAt: Number(item.created_time + '000'),
            updatedAt: Number(item.modified_time + '000'),
            // 目录信息
            catalog: level > 0 ? newCatalog : [],
          })
        }
        if (item.children) {
          dfs(item.children, catalog, level + 1)
        }
      })
    }
    dfs(tree)
    return this.catalog as FeiShuDoc[]
  }

  async download(page: FeiShuDoc): Promise<DocDetail> {
    let body = ''
    try {
      const pageBlocks = await this.feishu.getPageBlocks(page.id)
      body = this.f2m.toMarkdownString(pageBlocks)
    } catch (e: any) {
      out.warning(`${page.title} 下载出错: ${e.message}`)
      out.debug(e)
    }
    // 解析出properties
    const { body: newBody, properties } = getProps(page, body)
    const doc = {
      id: page.id,
      properties,
    }
    return {
      ...doc,
      body: newBody,
      body_original: body,
      doc_id: page.id,
      updated: page.updated,
      catalog: page.catalog,
    }
  }

  async getPageDetailList(cachedPages: FeiShuDoc[], ids: string[]) {
    let articleList: DocDetail[] = []
    let pages: FeiShuDoc[] = cachedPages
    if (ids?.length) {
      // 取交集，过滤不需要下载的page
      pages = pages.filter((page) => {
        const exist = ids.indexOf(page.id) > -1
        if (!exist) {
          const title = page.title
          out.info('跳过下载', title)
        }
        return exist
      })
    }
    if (!pages?.length) {
      out.info('跳过', '没有需要下载的文章')
      return articleList
    }
    out.info('待下载数', String(pages.length))
    out.access('开始下载文档...')
    pages = pages.map((item, index) => ({ ...item, _index: index + 1 } as FeiShuDoc))
    const promise = async (page: FeiShuDoc) => {
      out.info(`下载文档 ${page._index}/${pages.length}   `, page.title)
      let article = await this.download(page)
      articleList.push(article)
    }
    await asyncPool(this.config.limit || 3, pages, promise)
    out.info('已下载数', String(articleList.length))
    return articleList
  }
}

export default FeiShuClient
