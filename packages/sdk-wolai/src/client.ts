import { WoLaiConfig, WoLaiDoc, WoLaiTablePage, WoLaiTableRow, WoLaiTableRows } from './types'
import { out, request, RequestOptions } from '@elog/shared'
import { DocCatalog, DocDetail, DocProperties } from '@elog/types'
import asyncPool from 'tiny-async-pool'
import { genCatalog, props } from './utils'
import * as buffer from 'buffer'
class WoLaiClient {
  config: WoLaiConfig
  docList: WoLaiTableRow[] = []
  catalog: WoLaiTableRow[] = []

  constructor(config: WoLaiConfig) {
    this.config = config
    this.config.baseUrl = config.baseUrl || 'https://api.wolai.com/v1'
    if (!this.config.token || !this.config.pageId) {
      out.err('缺少参数', '缺少WoLai配置信息')
      process.exit(-1)
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
    const res = await this.request<WoLaiTablePage>('pages/getPageChunks', {
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
    const databaseId = res.block[this.config.pageId].value.database_id
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
    const tableFields = res.database_tables[databaseId].properties
    const docs = rows.rows.map((row, index) => {
      const properties = props(row, tableFields)
      return {
        ...row,
        properties,
        _index: index + 1,
      }
    })
    this.catalog.push(...docs)
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
    // 从 url 下载
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
    let catalog: DocCatalog[] | undefined
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
      docs = docs.filter((doc) => {
        const exist = ids.indexOf(doc.block_id) > -1
        if (!exist) {
          out.info('跳过下载', doc.properties.title)
        }
        return exist
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
