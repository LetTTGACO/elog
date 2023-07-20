import asyncPool from 'tiny-async-pool'
import { out, request, RequestOptions } from '@elog/shared'
import { encrypt, getLocalCookies, getProps } from '../utils'
import { YuQueResponse, YuqueDoc, YuqueDocProperties } from '../types'
import { DocDetail, YuqueCatalog, DocCatalog } from '@elog/types'
import path from 'path'
import fs from 'fs'
import jsdom, { JSDOM } from 'jsdom'
import { YuqueWithPwdConfig, YuqueLogin } from './types'
import mkdirp from 'mkdirp'

/** 默认语雀API 路径 */
const DEFAULT_API_URL = 'https://www.yuque.com'

class YuqueClient {
  config: YuqueWithPwdConfig
  namespace: string
  bookId: string = ''
  docList: YuqueDoc[] = []
  catalog: YuqueCatalog[] = []

  constructor(config: YuqueWithPwdConfig) {
    this.config = config
    this.config.username = config.username || process.env.YUQUE_USERNAME!
    this.config.password = config.password || process.env.YUQUE_PASSWORD!
    if (!this.config.username || !this.config.password) {
      out.err('缺少参数', '缺少语雀账号密码')
      process.exit(-1)
    }
    this.namespace = `${this.config.login}/${this.config.repo}`
  }

  /**
   * 登陆
   */
  async login() {
    out.info('开始登陆语雀...')
    const loginInfo = {
      login: this.config.username,
      password: encrypt(this.config.password),
      loginType: 'password',
    }
    let baseUrl = this.config.baseUrl || DEFAULT_API_URL
    if (baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      baseUrl = baseUrl.slice(0, -1)
    }
    const res = await request<YuQueResponse<YuqueLogin>>(`${baseUrl}/api/accounts/login`, {
      method: 'post',
      data: loginInfo,
      headers: {
        Referer: baseUrl + '/login?goto=https%3A%2F%2Fwww.yuque.com%2Fdashboard',
        origin: baseUrl,
      },
    })
    if (res.status !== 200) {
      // @ts-ignore
      out.err(res)
      process.exit(-1)
    }
    if (res.headers['set-cookie']) {
      // 保存cookie
      const cookieContent = JSON.stringify({
        time: Date.now(),
        cookie: res.headers['set-cookie'],
      })
      const outDir = path.join(process.cwd(), '/.yuque')
      mkdirp.sync(outDir)
      // 保存到本地
      fs.writeFileSync(path.join(outDir, 'cookies.json'), cookieContent)
    }
    // @ts-ignore
    out.info('语雀登陆成功', res.data.data.user)
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   * @param custom
   */
  async request<T>(api: string, reqOpts: RequestOptions, custom?: boolean): Promise<T> {
    const cookie = getLocalCookies()?.cookie
    if (!cookie) {
      out.err('缺少cookie')
      process.exit(-1)
    }
    let baseUrl = this.config.baseUrl || DEFAULT_API_URL
    if (baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      baseUrl = baseUrl.slice(0, -1)
    }
    const url = `${baseUrl}/${api}`
    const opts: RequestOptions = {
      headers: {
        cookie,
      },
      ...reqOpts,
    }
    if (custom) {
      const res = await request<T>(url, opts)
      return res.data
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
    console.log('this.namespace', this.namespace)
    const html = await this.request<string>(
      this.namespace,
      {
        method: 'GET',
        dataType: 'text',
      },
      true,
    )
    const virtualConsole = new jsdom.VirtualConsole()
    const window = new JSDOM(`${html}`, { runScripts: 'dangerously', virtualConsole }).window
    virtualConsole.on('error', () => {
      // don't do anything
      out.warning('获取目录失败')
    })
    const { book } = window.appData || {}
    this.bookId = book.id
    return book?.toc || []
  }

  /**
   * 获取文章列表(不带详情)
   */
  async getDocList() {
    // 获取目录信息
    this.catalog = await this.getToc()
    const docList = await this.request<YuqueDoc[]>(`api/docs`, {
      method: 'GET',
      data: { book_id: this.bookId },
    })
    this.docList = docList
    return docList
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
    console.log('getDocDetail-body', yuqueDocString)
    if (!yuqueDocString) {
      out.err('获取文章详情失败')
      process.exit(-1)
    }
    const doc = this.docList.find((item) => item.slug === slug)!
    const docInfo = {
      body: yuqueDocString,
      doc_id: '',
      catalog: [] as any[],
      ...doc,
    } as any
    docInfo.doc_id = slug
    const find = this.catalog.find((item) => item.slug === slug)
    if (find) {
      let catalogPath = []
      let parentId = find.parent_uuid
      for (let i = 0; i < find.depth - 1; i++) {
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
    out.info('开始下载文档...')
    docs = docs.map((item, index) => ({ ...item, _index: index + 1 } as YuqueDoc))
    const promise = async (doc: YuqueDoc) => {
      out.info(`下载文档 ${doc._index}/${docs.length}   `, doc.title)
      let article = await this.getDocDetail(doc.slug)
      // 解析出properties
      const { body, properties } = getProps(article, true)
      // 处理换行/自定义处理
      article.properties = properties as YuqueDocProperties
      // 替换body
      article.body = body
      article.updated = new Date(article.updated_at).getTime()
      articleList.push(article)
    }
    await asyncPool(5, docs, promise)
    out.info('已下载数', String(articleList.length))
    return articleList
  }
}

export default YuqueClient
