import { out } from '@elog/shared'
import { FlowUsCatalogConfig, FlowUsConfig, FlowUsDoc, FlowUsFilterAndSortParams } from './types'
import { FlowUsClient as FlowUsApi } from '@flowusx/flowus-client'
import { FlowUsToMarkdown } from '@flowusx/flowus-to-md'
import { DocCatalog, DocDetail } from '@elog/types'
import { filterDocs, genCatalog, props, sortDocs } from './utils'
import asyncPool from 'tiny-async-pool'
import { FlowUsSortDirectionEnum, FlowUsSortPresetEnum } from './const'

class FlowUsClient {
  config: FlowUsConfig
  flowus: FlowUsApi
  f2m: FlowUsToMarkdown
  catalog: FlowUsDoc[] = []
  filterAndSortParams: FlowUsFilterAndSortParams

  constructor(config: FlowUsConfig) {
    this.config = config
    this.config.tablePageId = config.tablePageId || process.env.FLOWUS_TABLE_PAGE_ID!
    if (!this.config.tablePageId) {
      out.err('缺少参数', '缺少 Table Page ID')
      process.exit(-1)
    }
    this.flowus = new FlowUsApi()
    this.f2m = new FlowUsToMarkdown({ client: this.flowus })
    this.initCatalogConfig()
    this.filterAndSortParams = this.initFilterAndSortParamsParams()
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
        out.access('开启分类', '默认按照 catalog 字段分类，请检查FlowUs多维表是否存在该属性')
        this.config.catalog = { enable: true, property: 'catalog' }
      }
    } else if (typeof this.config.catalog === 'object') {
      if (this.config.catalog.enable) {
        // 检查分类字段是否存在
        if (!this.config.catalog.property) {
          this.config.catalog.property = 'catalog'
          out.warning('未设置分类字段，默认按照 catalog 字段分类，请检查FlowUs多维表是否存在该属性')
        }
      }
    }
  }

  /**
   * 初始化过滤和排序参数
   */
  initFilterAndSortParamsParams(): FlowUsFilterAndSortParams {
    let sort = this.config.sort as FlowUsFilterAndSortParams['sort']
    if (typeof this.config.sort === 'boolean') {
      if (!this.config.sort) {
        // 不排序
        sort = undefined
      } else {
        // 默认排序
        sort = { property: 'createdAt', direction: FlowUsSortDirectionEnum.descending }
      }
    } else if (typeof this.config.sort === 'string') {
      // 预设值
      const sortPreset = this.config.sort as FlowUsSortPresetEnum
      switch (sortPreset) {
        case FlowUsSortPresetEnum.dateDesc:
          sort = { property: 'date', direction: FlowUsSortDirectionEnum.descending }
          break
        case FlowUsSortPresetEnum.dateAsc:
          sort = { property: 'date', direction: FlowUsSortDirectionEnum.ascending }
          break
        case FlowUsSortPresetEnum.sortDesc:
          sort = { property: 'sort', direction: FlowUsSortDirectionEnum.descending }
          break
        case FlowUsSortPresetEnum.sortAsc:
          sort = { property: 'sort', direction: FlowUsSortDirectionEnum.ascending }
          break
        case FlowUsSortPresetEnum.createTimeDesc:
          sort = {
            property: 'createdAt',
            direction: FlowUsSortDirectionEnum.descending,
          }
          break
        case FlowUsSortPresetEnum.createTimeAsc:
          sort = {
            property: 'createdAt',
            direction: FlowUsSortDirectionEnum.ascending,
          }
          break
        case FlowUsSortPresetEnum.updateTimeDesc:
          sort = {
            property: 'updatedAt',
            direction: FlowUsSortDirectionEnum.descending,
          }
          break
        case FlowUsSortPresetEnum.updateTimeAsc:
          sort = {
            property: 'updatedAt',
            direction: FlowUsSortDirectionEnum.ascending,
          }
          break
        default:
          sort = {
            property: 'createdAt',
            direction: FlowUsSortDirectionEnum.descending,
          }
      }
    }

    let filter = this.config.filter as FlowUsFilterAndSortParams['filter']
    // 如果是boolean类型
    if (typeof this.config.filter === 'boolean') {
      // 如果设置为false
      if (!this.config.filter) {
        filter = undefined
      } else {
        // 如果设置为true
        filter = {
          property: 'status',
          value: '已发布',
        }
      }
    }
    return {
      filter,
      sort,
    }
  }

  async getPageList(): Promise<FlowUsDoc[]> {
    const pageBlocks = await this.flowus.getDataTableData(this.config.tablePageId)
    const blocks = pageBlocks.blocks
    const blocksKeys = Object.keys(blocks)
    const tableBlockKey = blocksKeys[0]
    const tableBlock = blocks[tableBlockKey]
    const pageIds = tableBlock.subNodes
    const { filter, sort } = this.filterAndSortParams
    let filterAndSortDoc = pageIds.map((pageId) => {
      const pageBLock = blocks[pageId]
      const properties = props(pageBLock, tableBlock)
      return {
        id: pageBLock.uuid,
        doc_id: pageBLock.uuid,
        title: pageBLock.title,
        updated: pageBLock.updatedAt,
        createdAt: pageBLock.createdAt,
        updatedAt: pageBLock.updatedAt,
        properties,
      }
    }) as FlowUsDoc[]
    // 过滤
    filterAndSortDoc = filterDocs(filterAndSortDoc, filter)
    // 排序
    filterAndSortDoc = sortDocs(filterAndSortDoc, sort)
    this.catalog = filterAndSortDoc
    return filterAndSortDoc
  }

  async download(page: FlowUsDoc): Promise<DocDetail> {
    let body = ''
    try {
      const pageBlocks = await this.flowus.getPageBlocks(page.id)
      body = this.f2m.toMarkdownString(pageBlocks)
    } catch (e: any) {
      out.warning(`${page.title} 下载出错: ${e.message}`)
      out.debug(e)
    }
    const doc = {
      id: page.id,
      properties: page.properties,
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
      doc_id: page.id,
      updated: page.updated,
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
    pages = pages.map((item, index) => ({ ...item, _index: index + 1 } as FlowUsDoc))
    const promise = async (page: FlowUsDoc) => {
      out.info(`下载文档 ${page._index}/${pages.length}   `, page.title)
      let article = await this.download(page)
      articleList.push(article)
    }
    await asyncPool(5, pages, promise)
    out.info('已下载数', String(articleList.length))
    return articleList
  }
}

export default FlowUsClient
