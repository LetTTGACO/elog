import { out } from '@elog/shared'
import { FeiShuConfig, FeiShuDoc } from './types'
import { FeiShuClient as FeiShuApi } from '@feishux/api'
import { IFolderData, IWikiNode } from '@feishux/shared'
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
    this.config.folderToken = config.folderToken
    this.config.appId = config.appId
    this.config.appSecret = config.appSecret
    if (!this.config.appId || !this.config.appSecret) {
      out.err('缺少参数', '缺少文件夹Token或知识库 ID')
      process.exit(-1)
    }
    if (config.type === 'wiki' && !config.wikiId) {
      out.err('缺少参数', '缺少知识库ID')
      process.exit(-1)
    } else if ((!config.type || config.type === 'space') && !config.folderToken) {
      out.err('缺少参数', '缺少我的空间中文件夹 ID')
      process.exit(-1)
    }
    this.feishu = new FeiShuApi({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      baseUrl: this.config.baseUrl,
    })
    this.f2m = new FeiShuToMarkdown()
  }

  async getPageList(): Promise<FeiShuDoc[]> {
    // 知识库
    if (this.config.type === 'wiki') {
      return this.getWikiList()
    }
    // 我的空间
    return this.getSpaceList()
  }

  /**
   * 获取知识库文档
   */
  async getWikiList(): Promise<FeiShuDoc[]> {
    // 获取知识库字节点
    const getNodes = async (
      parentNode?: {
        nodeToken?: string
        objToken?: string
        title?: string
      },
      level = 0,
      catalog = [],
    ) => {
      let nodes = await this.feishu.getReposNodes(
        this.config.wikiId as string,
        parentNode?.nodeToken,
      )
      nodes = nodes
        .filter((item) => item.obj_type == 'doc' || item.obj_type == 'docx')
        .map((item) => {
          const newCatalog = [
            ...catalog,
            { title: parentNode?.title || '', doc_id: parentNode?.objToken || '' },
          ]
          const doc: Omit<FeiShuDoc, 'properties'> & Partial<IWikiNode> = {
            doc_id: item.obj_token,
            id: item.obj_token,
            title: item.title,
            createdAt: Number(item.obj_create_time + '000'),
            updated: Number(item.obj_edit_time + '000'),
            updatedAt: Number(item.obj_edit_time + '000'),
            catalog: level > 0 ? newCatalog : [],
            has_child: item.has_child,
            node_token: item.node_token,
            parent_node_token: item.parent_node_token,
          }
          this.catalog.push(doc)
          return doc
        }) as unknown as Omit<FeiShuDoc, 'properties'> & IWikiNode[]
      for (const doc of nodes as any[]) {
        if (doc.has_child) {
          await getNodes(
            {
              nodeToken: doc.node_token,
              title: doc.title,
              objToken: doc.obj_token,
            },
            level + 1,
            doc.catalog,
          )
        }
      }
    }
    await getNodes({ nodeToken: this.config.folderToken })
    return this.catalog as FeiShuDoc[]
  }

  /**
   * 获取我的空间下指定文件夹文档
   */

  async getSpaceList(): Promise<FeiShuDoc[]> {
    const tree = await this.feishu.getFolderTree(this.config.folderToken as string)
    const self = this

    // 深度优先遍历tree
    function dfs(tree: IFolderData[], catalog: any[] = [], level = 0, parent?: IFolderData) {
      tree.map((item) => {
        const newCatalog = [...catalog, { title: parent?.name, doc_id: parent?.token }]
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
          dfs(item.children, level > 0 ? newCatalog : [], level + 1, item)
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
