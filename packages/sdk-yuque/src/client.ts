import asyncPool from 'tiny-async-pool'
import { out, request, RequestOptions } from '@elog/shared'
import { getProps, processHtmlRaw, processMarkdownRaw } from './utils'
import {
  YuqueConfig,
  YuQueResponse,
  DocUnite,
  YuqueDoc,
  YuqueDocDetail,
  YuqueDocProperties,
} from './types'
import { DocDetail, YuqueCatalog, DocCatalog } from '@elog/types'

/** 默认语雀API 路径 */
const DEFAULT_API_URL = 'https://www.yuque.com/api/v2'

class YuqueClient {
  config: YuqueConfig
  namespace: string
  catalog: YuqueCatalog[] = []

  constructor(config: YuqueConfig) {
    this.config = config
    this.config.token = config.token || process.env.YUQUE_TOKEN!
    if (!this.config.token) {
      out.err('缺少参数', '缺少语雀Token')
      process.exit(-1)
    }
    this.namespace = `${config.login}/${config.repo}`
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   */
  async request<T>(api: string, reqOpts: RequestOptions): Promise<T> {
    const { token } = this.config
    let baseUrl = this.config.baseUrl || DEFAULT_API_URL
    if (baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      baseUrl = baseUrl.slice(0, -1)
    }
    const url = `${baseUrl}/${api}`
    const opts: RequestOptions = {
      headers: {
        'X-Auth-Token': token,
      },
      ...reqOpts,
    }
    const res = await request<YuQueResponse<T>>(url, opts)
    if (res.status !== 200) {
      out.warning(JSON.stringify(res))
    }
    return res.data.data
  }

  /**
   * 获取目录
   */
  async getToc() {
    return this.request<YuqueCatalog[]>(`repos/${this.namespace}/toc`, {
      method: 'GET',
    })
  }

  /**
   * 获取文章列表(不带详情)
   */
  async getDocList() {
    return this.request<YuqueDoc[]>(`repos/${this.namespace}/docs`, {
      method: 'GET',
    })
  }

  /**
   * 获取文章详情
   */
  async getDocDetail(slug: string) {
    const yuqueDoc = await this.request<YuqueDocDetail>(`repos/${this.namespace}/docs/${slug}`, {
      method: 'GET',
      data: { raw: 1 },
    })
    const docInfo = yuqueDoc as DocUnite
    docInfo.doc_id = yuqueDoc.slug
    const find = this.catalog.find((item) => item.slug === yuqueDoc.slug)
    if (find) {
      let catalogPath = []
      let parentId = find.parent_uuid
      for (let i = 0; i < find.depth - 1; i++) {
        const current = this.catalog.find((item) => item.uuid === parentId)!
        parentId = current.parent_uuid
        const catalog: DocCatalog = {
          title: current.title,
          doc_id: yuqueDoc.slug,
        }
        catalogPath.push(catalog)
      }
      docInfo.catalog = catalogPath.reverse()
    }
    // 处理HTML
    docInfo.body_html = processHtmlRaw(docInfo.body_html)
    return docInfo
  }

  /**
   * 获取文章详情列表
   * @param cachedDocs
   * @param ids
   */
  async getDocDetailList(cachedDocs: YuqueDoc[], ids: string[]) {
    // 获取目录信息
    this.catalog = await this.getToc()
    let articleList: DocDetail[] = []
    let docs = cachedDocs
    if (ids.length) {
      // 取交集，过滤不需要下载的page
      docs = docs.filter((doc) => {
        const exist = ids.indexOf(doc.slug) > -1
        if (!exist) {
          out.access('跳过下载', doc.title)
        }
        return exist
      })
    }
    if (!docs?.length) {
      out.access('跳过', '没有需要下载的文章')
      return articleList
    }
    out.info('待下载数', String(docs.length))
    out.info('开始下载文档...')
    const promise = async (doc: YuqueDoc) => {
      out.info('下载文档', doc.title)
      let article = await this.getDocDetail(doc.slug)
      article.body_original = article.body
      // 解析出properties
      const { body, properties } = getProps(article)
      const newBody = processMarkdownRaw(body)
      article.properties = properties as YuqueDocProperties
      // 替换body
      article.body = newBody
      article.updated = new Date(article.updated_at).getTime()
      articleList.push(article)
    }
    await asyncPool(5, docs, promise)
    out.access('已下载数', String(articleList.length))
    return articleList
  }
}

export default YuqueClient
