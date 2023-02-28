import { request, RequestOptions } from 'urllib'
import asyncPool from 'tiny-async-pool'
import { out } from '@elog/shared'
import { Doc, DocInfo, Properties, RequestError, YuqueConfig } from './types'
import { getProps } from './utils'

/** 默认语雀API 路径 */
const DEFAULT_API_URL = 'https://www.yuque.com/api/v2'

class YuqueClient {
  config: YuqueConfig
  namespace: string

  constructor(config: YuqueConfig) {
    this.config = config
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
      method: 'GET',
      contentType: 'json',
      dataType: 'json',
      headers: {
        'User-Agent': '@elog/sdk-yuque',
        'X-Auth-Token': token,
      },
      gzip: true,
      // proxy
      rejectUnauthorized: !process.env.http_proxy,
      enableProxy: !!process.env.http_proxy,
      proxy: process.env.http_proxy,
      // 超时时间 60s
      timeout: 60000,
      ...reqOpts,
    }
    const res = await request(url, opts)
    if (res.status !== 200) {
      const err = new RequestError(res.data.message)
      /* istanbul ignore next */
      err.status = res.data.status || res.status
      err.code = res.data.code
      err.data = res
      throw err
    }
    return res.data.data
  }

  /**
   * 获取文章列表(不带详情)
   */
  async getDocList() {
    return this.request<DocInfo[]>(`repos/${this.namespace}/docs`, {
      method: 'GET',
    })
  }

  /**
   * 获取文章详情
   */
  async getDocDetail(slug: string) {
    const res = await this.request<Doc>(`repos/${this.namespace}/docs/${slug}`, {
      method: 'GET',
      data: { raw: 1 },
    })
    res.doc_id = res.slug
    return res
  }

  /**
   * 获取文章详情列表
   * @param cachedDocs
   * @param ids
   */
  async getDocDetailList(cachedDocs: DocInfo[], ids?: string[]) {
    let articleList: Doc[] = []
    let docs: DocInfo[]
    if (cachedDocs) {
      docs = cachedDocs
    } else {
      docs = await this.getDocList()
    }
    if (ids?.length) {
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
    const promise = async (doc: DocInfo) => {
      out.info('文章下载', doc.title)
      let article = await this.getDocDetail(doc.slug)
      // 解析出properties
      const { body, properties } = getProps(article)
      article.properties = properties as Properties
      // 替换body
      article.body = body
      article.updated = new Date(article.updated_at).getTime()
      articleList.push(article as Doc)
    }
    await asyncPool(5, docs, promise)
    out.access('已下载数', String(articleList.length))
    return articleList
  }
}

export default YuqueClient
