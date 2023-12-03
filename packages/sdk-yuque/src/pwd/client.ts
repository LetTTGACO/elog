import asyncPool from 'tiny-async-pool'
import { out, request, RequestOptions } from '@elog/shared'
import { encrypt, getProps } from '../utils'
import { YuQueResponse, YuqueDoc, YuqueDocProperties, YuqueDocListResponse } from '../types'
import { DocDetail, YuqueCatalog, DocCatalog } from '@elog/types'
import { JSDOM } from 'jsdom'
import { YuqueWithPwdConfig, YuqueLogin, YuqueLoginCookie } from './types'
import { IllegalityDocFormat } from '../const'

/** 默认语雀API 路径 */
const DEFAULT_HOST = 'https://www.yuque.com'

class YuqueClient {
  config: YuqueWithPwdConfig
  namespace: string
  baseUrl: string
  bookId: string = ''
  docList: YuqueDoc[] = []
  catalog: YuqueCatalog[] = []
  cookie: YuqueLoginCookie | undefined

  constructor(config: YuqueWithPwdConfig) {
    this.config = config
    this.config.username = config.username || process.env.YUQUE_USERNAME!
    this.config.password = config.password || process.env.YUQUE_PASSWORD!
    if (!this.config.username || !this.config.password || !this.config.login || !this.config.repo) {
      out.err('缺少参数', '缺少语雀配置信息')
      process.exit(-1)
    }
    this.namespace = `${this.config.login}/${this.config.repo}`
    this.baseUrl = this.config.host || DEFAULT_HOST
    if (this.baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      this.baseUrl = this.baseUrl.slice(0, -1)
    }
  }

  /**
   * 登陆
   */
  async login() {
    const loginInfo = {
      login: this.config.username,
      password: encrypt(this.config.password),
      loginType: 'password',
    }

    const res = await request<YuQueResponse<YuqueLogin>>(
      `${this.baseUrl}/api/mobile_app/accounts/login?language=zh-cn`,
      {
        method: 'post',
        data: loginInfo,
        headers: {
          Referer: this.baseUrl + '/login?goto=https%3A%2F%2Fwww.yuque.com%2Fdashboard',
          origin: this.baseUrl,
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20G81 YuqueMobileApp/1.0.2 (AppBuild/650 Device/Phone Locale/zh-cn Theme/light YuqueType/public)',
        },
      },
    )
    if (res.status !== 200) {
      out.err('语雀登陆失败')
      // @ts-ignore
      out.err(res)
      process.exit(-1)
    }
    if (res.headers['set-cookie']) {
      // 保存cookie
      this.cookie = {
        time: Date.now(),
        data: res.headers['set-cookie'] as string,
      }
    }
    out.info('语雀登陆成功')
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   * @param custom
   */
  async request<T>(api: string, reqOpts: RequestOptions, custom?: boolean): Promise<T> {
    const url = `${this.baseUrl}/${api}`
    const opts: RequestOptions = {
      headers: {
        cookie: this.cookie?.data,
      },
      ...reqOpts,
    }
    if (!opts.headers?.cookie) {
      out.err('未登录语雀!')
      process.exit(-1)
    }
    if (custom) {
      const res = await request<T>(url, opts)
      return res.data
    }
    const res = await request<YuQueResponse<T>>(url, opts)
    if (res.status !== 200) {
      // @ts-ignore
      out.err(res)
    }
    return res.data.data
  }

  /**
   * 获取目录
   */
  async getToc() {
    try {
      const res = await this.request(this.namespace, { method: 'get', dataType: 'text' }, true)
      const dom = new JSDOM(`${res}`, { runScripts: 'dangerously' })
      const { book } = dom?.window?.appData || {}
      dom.window.close()
      if (!book) {
        out.warning('爬取语雀目录失败，请稍后重试')
        process.exit(-1)
      }
      this.bookId = book.id
      return book?.toc || []
    } catch (e: any) {
      out.warning('爬取语雀目录失败，请稍后重试', e.message)
      process.exit(-1)
    }
  }

  /**
   * 获取文章列表(不带详情)
   */
  async getDocList() {
    // 获取目录信息
    this.catalog = await this.getToc()
    const list: YuqueDoc[] = []
    const getList = async (offset = 0) => {
      const res = await this.request<YuqueDocListResponse>(
        `api/docs`,
        {
          method: 'GET',
          data: { offset },
        },
        true,
      )
      list.push(...res.data)
      if (res.meta.total > list.length) {
        await getList(offset + 1)
      }
    }
    await getList()
    this.docList = list
    return list
  }

  /**
   * 获取文章详情
   */
  async getDocDetail(slug: string) {
    const yuqueDocString = await this.request<string>(
      `${this.namespace}/${slug}/markdown`,
      {
        method: 'GET',
        data: {
          attachment: true,
          latexcode: false,
          anchor: false,
          linebreak: this.config.linebreak,
        },
        dataType: 'text',
      },
      true,
    )
    const doc = this.docList.find((item) => item.slug === slug)!
    const docInfo = {
      body: yuqueDocString,
      doc_id: slug,
      catalog: [] as any[],
      ...doc,
    } as any
    const find = this.catalog.find((item) => item.url === slug)
    if (find) {
      let catalogPath = []
      let parentId = find.parent_uuid
      for (let i = 0; i < find.level; i++) {
        const current = this.catalog.find((item) => item.uuid === parentId)!
        parentId = current.parent_uuid
        const catalog: DocCatalog = {
          title: current.title,
          doc_id: slug,
        }
        catalogPath.push(catalog)
      }
      docInfo.catalog = catalogPath.reverse()
    }
    return docInfo
  }

  /**
   * 获取文章详情列表
   * @param cachedDocs
   * @param ids
   */
  async getDocDetailList(cachedDocs: YuqueDoc[], ids: string[]) {
    let articleList: DocDetail[] = []
    let docs = cachedDocs
    if (ids.length) {
      // 取交集，过滤不需要下载的page
      docs = docs.filter((doc) => {
        const exist = ids.indexOf(doc.slug) > -1
        if (!exist) {
          out.info('跳过下载', doc.title)
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
    docs = docs.map((item, index) => ({ ...item, _index: index + 1 } as YuqueDoc))
    const promise = async (doc: YuqueDoc) => {
      out.info(`下载文档 ${doc._index}/${docs.length}   `, doc.title)
      let article = await this.getDocDetail(doc.slug)
      if (!doc.format && IllegalityDocFormat.some((item) => item === article.format)) {
        out.warning('注意', `【${article.title}】为不支持的文档格式`)
      }
      // 解析出properties
      const { body, properties } = getProps(article, true)
      // 处理换行/自定义处理
      article.properties = properties as YuqueDocProperties
      article.body = body
      article.body_original = body
      article.updated = new Date(article.updated_at).getTime()
      articleList.push(article)
    }
    await asyncPool(this.config.limit || 3, docs, promise)
    out.info('已下载数', String(articleList.length))
    return articleList
  }
}

export default YuqueClient
