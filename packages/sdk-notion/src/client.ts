import { Client } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'
import asyncPool from 'tiny-async-pool'
import { genCatalog, props } from './utils'
import {
  NotionCatalogConfig,
  NotionConfig,
  NotionDoc,
  NotionQueryParams,
  NotionSort,
} from './types'
import { out } from '@elog/shared'
import { DocDetail, DocCatalog, NotionCatalog } from '@elog/types'
import { NotionSortDirectionEnum, NotionSortPresetEnum } from './const'

/**
 * Notion SDK
 */
class NotionClient {
  config: NotionConfig
  notion: Client
  n2m: NotionToMarkdown
  catalog: NotionCatalog[] = []
  requestQueryParams: NotionQueryParams
  docList: NotionDoc[] = []
  constructor(config: NotionConfig) {
    this.config = config
    this.config.token = config.token || process.env.NOTION_TOKEN!
    if (!this.config.token) {
      out.err('缺少参数', '缺少Notion Token')
      process.exit(-1)
    }
    this.notion = new Client({ auth: this.config.token })
    this.n2m = new NotionToMarkdown({ notionClient: this.notion })
    this.initCatalogConfig()
    this.requestQueryParams = this.initRequestQueryParams()
  }

  /**
   * 初始化目录配置
   */
  initCatalogConfig() {
    if (typeof this.config.catalog === 'boolean') {
      if (!this.config.catalog) {
        // 不启用目录
        this.config.catalog = { enable: false }
      } else {
        // 启用目录
        out.info('开启分类', '默认按照 catalog 字段分类，请检查Notion数据库是否存在该属性')
        this.config.catalog = { enable: true, property: 'catalog' }
      }
    } else if (typeof this.config.catalog === 'object') {
      if (this.config.catalog.enable) {
        // 检查分类字段是否存在
        if (!this.config.catalog.property) {
          this.config.catalog.property = 'catalog'
          out.warning('未设置分类字段，默认按照 catalog 字段分类，请检查Notion数据库是否存在该属性')
        }
      }
    }
  }

  /**
   * 初始化请求参数
   */
  initRequestQueryParams() {
    let sorts: any
    if (typeof this.config.sorts === 'boolean') {
      if (!this.config.sorts) {
        // 不排序
        sorts = undefined
      } else {
        // 默认排序
        sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.descending }]
      }
      sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.descending }]
    } else if (typeof this.config.sorts === 'string') {
      // 预设值
      const sortPreset = this.config.sorts as NotionSortPresetEnum
      switch (sortPreset) {
        case NotionSortPresetEnum.dateDesc:
          sorts = [{ property: 'date', direction: NotionSortDirectionEnum.descending }]
          break
        case NotionSortPresetEnum.dateAsc:
          sorts = [{ property: 'date', direction: NotionSortDirectionEnum.ascending }]
          break
        case NotionSortPresetEnum.sortDesc:
          sorts = [{ property: 'sort', direction: NotionSortDirectionEnum.descending }]
          break
        case NotionSortPresetEnum.sortAsc:
          sorts = [{ property: 'sort', direction: NotionSortDirectionEnum.ascending }]
          break
        case NotionSortPresetEnum.createTimeDesc:
          sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.descending }]
          break
        case NotionSortPresetEnum.createTimeAsc:
          sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.ascending }]
          break
        case NotionSortPresetEnum.updateTimeDesc:
          sorts = [{ timestamp: 'last_edited_time', direction: NotionSortDirectionEnum.descending }]
          break
        case NotionSortPresetEnum.updateTimeAsc:
          sorts = [{ timestamp: 'last_edited_time', direction: NotionSortDirectionEnum.ascending }]
          break
        default:
          sorts = [{ timestamp: 'created_time', direction: NotionSortDirectionEnum.descending }]
      }
    } else {
      // 自定义排序
      sorts = this.config.sorts as NotionSort[]
    }

    let filter: any
    if (typeof this.config.filter === 'boolean') {
      if (!this.config.filter) {
        filter = undefined
      } else {
        filter = {
          property: 'status',
          select: {
            equals: '已发布',
          },
        }
      }
    } else if (!this.config.filter) {
      filter = {
        property: 'status',
        select: {
          equals: '已发布',
        },
      }
    } else {
      filter = this.config.filter
    }
    return {
      database_id: this.config.databaseId,
      filter,
      sorts,
    }
  }

  /**
   * 获取指定文章列表
   */
  async getPageList() {
    let resp = await this.notion.databases.query({
      ...this.requestQueryParams,
    })
    let docs = resp.results as NotionDoc[]
    docs = docs.map((doc) => {
      // 转换props
      doc.properties = props(doc)
      return doc
    })
    this.catalog.push(...docs)
    this.docList.push(...docs)
    // 分页查询
    if (resp.has_more && resp.next_cursor) {
      this.requestQueryParams = {
        ...this.requestQueryParams,
        start_cursor: resp.next_cursor,
      }
      await this.getPageList()
    }
    return this.docList
  }

  /**
   * 下载一篇文章
   * @param {*} page
   */
  async download(page: NotionDoc): Promise<DocDetail> {
    const blocks = await this.n2m.pageToMarkdown(page.id)
    let body = this.n2m.toMarkdownString(blocks)
    const timestamp = new Date(page.last_edited_time).getTime()
    let catalog: DocCatalog[] | undefined
    const catalogConfig = this.config.catalog as NotionCatalogConfig
    if (catalogConfig?.enable) {
      // 生成目录
      catalog = genCatalog(page, catalogConfig.property!)
    }
    return {
      id: page.id,
      doc_id: page.id,
      properties: page.properties,
      body,
      body_original: body,
      updated: timestamp,
      catalog,
    }
  }

  /**
   * 获取文章列表
   * @param cachedPages 已经下载过的pages
   * @param ids 需要下载的doc_id列表
   */
  async getPageDetailList(cachedPages: NotionDoc[], ids: string[]) {
    // 获取待发布的文章
    let articleList: DocDetail[] = []
    let pages: NotionDoc[] = cachedPages
    if (ids?.length) {
      // 取交集，过滤不需要下载的page
      pages = pages.filter((page) => {
        const exist = ids.indexOf(page.id) > -1
        if (!exist) {
          // @ts-ignore
          const title = page.properties.title
          out.access('跳过下载', title)
        }
        return exist
      })
    }
    if (!pages?.length) {
      out.access('跳过', '没有需要下载的文章')
      return articleList
    }
    const promise = async (page: NotionDoc) => {
      let article = await this.download(page)
      out.info('下载文档', article.properties.title)
      articleList.push(article)
    }
    await asyncPool(5, pages, promise)
    out.access('已下载数', String(articleList.length))
    return articleList
  }
}

export default NotionClient
