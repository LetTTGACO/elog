import {
  WoLaiConfig,
  WoLaiDoc,
  WolaiFilterAndSortParams,
  WoLaiTablePage,
  WoLaiTableRow,
  WoLaiTableRows,
} from './types'
import { out, request, RequestOptions } from '@elog/shared'
import { DocCatalog, DocDetail, DocProperties } from '@elog/types'
import asyncPool from 'tiny-async-pool'
import { filterDocs, genCatalog, props, sortDocs } from './utils'
import * as buffer from 'buffer'
import { WolaiSortDirectionEnum, WolaiSortPresetEnum } from './const'

/**
 * WoLaiClient
 */
class WoLaiClient {
  config: WoLaiConfig
  docList: WoLaiTableRow[] = []
  catalog: WoLaiTableRow[] = []
  filterAndSortParams: WolaiFilterAndSortParams

  constructor(config: WoLaiConfig) {
    this.config = config
    this.config.baseUrl = config.baseUrl || 'https://api.wolai.com/v1'
    if (!this.config.token || !this.config.pageId) {
      out.err('缺少参数', '缺少WoLai配置信息')
      process.exit(-1)
    }
    this.filterAndSortParams = this.initFilterAndSortParamsParams()
  }

  /**
   * 初始化过滤和排序参数
   */
  initFilterAndSortParamsParams(): WolaiFilterAndSortParams {
    let sort = this.config.sort as WolaiFilterAndSortParams['sort']
    if (typeof this.config.sort === 'boolean') {
      if (!this.config.sort) {
        // 不排序
        sort = undefined
      } else {
        // 默认排序
        sort = { property: 'createdAt', direction: WolaiSortDirectionEnum.descending }
      }
    } else if (typeof this.config.sort === 'string') {
      // 预设值
      const sortPreset = this.config.sort as WolaiSortPresetEnum
      switch (sortPreset) {
        case WolaiSortPresetEnum.dateDesc:
          sort = { property: 'date', direction: WolaiSortDirectionEnum.descending }
          break
        case WolaiSortPresetEnum.dateAsc:
          sort = { property: 'date', direction: WolaiSortDirectionEnum.ascending }
          break
        case WolaiSortPresetEnum.sortDesc:
          sort = { property: 'sort', direction: WolaiSortDirectionEnum.descending }
          break
        case WolaiSortPresetEnum.sortAsc:
          sort = { property: 'sort', direction: WolaiSortDirectionEnum.ascending }
          break
        case WolaiSortPresetEnum.createTimeDesc:
          sort = {
            property: 'createdAt',
            direction: WolaiSortDirectionEnum.descending,
          }
          break
        case WolaiSortPresetEnum.createTimeAsc:
          sort = {
            property: 'createdAt',
            direction: WolaiSortDirectionEnum.ascending,
          }
          break
        case WolaiSortPresetEnum.updateTimeDesc:
          sort = {
            property: 'updatedAt',
            direction: WolaiSortDirectionEnum.descending,
          }
          break
        case WolaiSortPresetEnum.updateTimeAsc:
          sort = {
            property: 'updatedAt',
            direction: WolaiSortDirectionEnum.ascending,
          }
          break
        default:
          sort = {
            property: 'createdAt',
            direction: WolaiSortDirectionEnum.descending,
          }
      }
    }

    let filter = this.config.filter as WolaiFilterAndSortParams['filter']
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

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   */
  async request<T>(api: string, reqOpts: RequestOptions): Promise<T> {
    const url = `${this.config.baseUrl}/${api}`
    // 将 token 设置到请求 cookie 中
    const cookie = `token=${this.config.token}`
    const opts: RequestOptions = {
      headers: {
        cookie: cookie,
      },
      ...reqOpts,
    }
    const res = await request<any>(url, opts)

    return res.data.data
  }

  /**
   * 获取文章列表(不带详情)
   */
  async getDocList(): Promise<WoLaiDoc[]> {
    // 获取表格信息
    const tablePage = await this.request<WoLaiTablePage>('pages/getPageChunks', {
      method: 'post',
      data: {
        pageId: this.config.pageId,
        limit: 100,
        position: {
          stack: [],
        },
        chunkNumber: 0,
      },
    })
    const databaseId = tablePage.block[this.config.pageId].value.database_id
    // 获取表格文档列表
    const rows = await this.request<WoLaiTableRows>('database/tableViewRows', {
      method: 'post',
      data: {
        table_id: databaseId,
        // TODO "view_id": "",
        limit: 1000,
        value: 'all',
        offset: 0,
        disableGroup: false,
        filters: {
          logical: 'and',
          filters: [],
        },
        sorters: [],
        group: false,
        search: '',
        snapshot: null,
        timezoneOffset: -480,
      },
    })
    // 转换 props
    const tableFields = tablePage.database_tables[databaseId].properties
    let docs = rows.rows.map((row) => {
      const properties = props(row, tableFields)
      return {
        ...row,
        createdAt: row.created_time,
        updatedAt: row.edited_time,
        properties,
      }
    })
    const { filter, sort } = this.filterAndSortParams
    docs = filterDocs(docs, filter)
    // 排序
    docs = sortDocs(docs, sort)
    // 过滤条件
    this.catalog = docs
    this.docList = docs
    return docs
  }

  /**
   * 获取文章详情
   */
  async getDocDetail(row: WoLaiDoc): Promise<DocDetail> {
    const url = await this.request<string>('exportMarkdown', {
      method: 'post',
      data: {
        pageId: row.block_id,
        pageTitle: row.properties.title,
        options: {
          recoverTree: false,
          generateToc: 'none',
          includeSubPage: false,
        },
      },
    })
    // 从 url 下载buffer
    const res = await request<Buffer>(url, { method: 'get', dataType: 'buffer' })
    // Buffer 转字符串
    const body = buffer.Buffer.from(res.data).toString('utf-8')

    const doc = {
      id: row.block_id,
      doc_id: row.block_id,
      properties: row.properties as DocProperties,
      body,
      body_original: body,
      updated: row.edited_time,
    }
    let catalog: DocCatalog[] | undefined = []
    const catalogConfig = this.config.catalog
    if (catalogConfig?.enable) {
      // 生成目录
      catalog = genCatalog(doc, catalogConfig.property || 'catalog')
    }
    return {
      ...doc,
      catalog,
    }
  }

  /**
   * 获取文章详情列表
   * @param cachedDocs
   * @param ids
   */
  async getDocDetailList(cachedDocs: WoLaiDoc[], ids: string[]) {
    let articleList: DocDetail[] = []
    let docs = cachedDocs
    if (ids.length) {
      // 取交集，过滤不需要下载的page
      docs = docs
        .filter((doc) => {
          const exist = ids.indexOf(doc.block_id) > -1
          if (!exist) {
            out.info('跳过下载', doc.properties.title)
          }
          return exist
        })
        .map((item, index) => {
          return {
            ...item,
            _index: index + 1,
          }
        })
    }
    if (!docs?.length) {
      out.access('跳过', '没有需要下载的文章')
      return articleList
    }
    out.info('待下载数', String(docs.length))
    out.access('开始下载文档...')
    const promise = async (doc: WoLaiDoc) => {
      out.info(`下载文档 ${doc._index}/${docs.length}   `, doc.properties.title)
      let article = await this.getDocDetail(doc)
      articleList.push(article)
    }
    await asyncPool(this.config.limit || 3, docs, promise)
    out.info('已下载数', String(articleList.length))
    return articleList
  }
}

export default WoLaiClient
