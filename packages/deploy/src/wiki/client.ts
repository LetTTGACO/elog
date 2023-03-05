import { DocDetail, WikiConfig } from '../types'
import { request, RequestOptions } from 'urllib'
import { RequestError, WikiPageDetail, WikiPageList, WikiPageListResponse } from './types'
import { out } from '@elog/shared'

class WikiClient {
  config: WikiConfig
  auth: string

  constructor(config: WikiConfig) {
    this.config = config
    if (!config.user || !config.password) {
      out.err('缺少参数', '缺少Confluence账号密码')
      process.exit(-1)
    }
    if (!config.baseUrl) {
      out.err('缺少参数', '缺少Confluence baseUrl')
      process.exit(-1)
    }
    this.auth = `${config.user}:${config.password}`
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   */
  async request<T>(api: string, reqOpts: RequestOptions): Promise<T> {
    let baseUrl = this.config.baseUrl
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
        'User-Agent': '@elog/deploy',
      },
      gzip: true,
      auth: this.auth,
      // 超时时间 60s
      timeout: 60000,
      ...reqOpts,
    }
    // @ts-ignore
    out.info(JSON.stringify(opts))
    const res = await request(url, opts)
    if (res.status !== 200) {
      const err = new RequestError(res.data.message)
      /* istanbul ignore next */
      err.status = res.data.status || res.status
      err.code = res.data.code
      err.data = res
      throw err
    }
    return res.data
  }

  /**
   * 生成参数
   * @param post
   * @param id
   * @param parentId
   */
  processBody(post: DocDetail, id?: string, parentId?: string) {
    let params = {
      type: 'page',
      title: post.title,
      space: {
        key: this.config.spaceKey,
      },
      ancestors: [
        {
          id: parentId || this.config.rootPageId,
        },
      ],
      body: {
        wiki: {
          value: post.body_wiki,
          representation: 'wiki',
        },
      },
      expand: ['ancestors'],
    }
    if (id) {
      // @ts-ignore
      params.id = id
    }
    return params
  }

  /**
   * 根据Id查询文章
   * @param id
   */
  async getPageById(id: string) {
    return this.request<WikiPageDetail>(`content/${id}`, {
      method: 'GET',
      data: {
        expand: 'version.number',
      },
    })
  }

  /**
   * 根据Title查询文章(精确查询)，没有则查询整个空间的文章列表
   * @param title
   */
  async getPageByTitle(title: string) {
    return this.request<WikiPageList>('content', {
      method: 'GET',
      data: {
        title,
        spaceKey: this.config.spaceKey,
      },
    })
  }

  /**
   * 根据parentId查询文章
   */
  async getRootPageList() {
    const res = await this.request<WikiPageListResponse>(
      `search?cql=space=${this.config.spaceKey} and ancestor=${this.config.rootPageId}&limit=1000`,
      {
        method: 'GET',
      },
    )
    if (!res.results?.length) {
      return []
    }
    return res.results.map((item) => {
      return {
        ...item.content,
      }
    })
  }

  /**
   * 根据id查询文章
   * @param id
   */
  async getPagesById(id: string) {
    return this.request<WikiPageList>(`search?cql=id=${id}`, { method: 'GET' })
  }

  /**
   * 创建文章
   * @param post
   * @param parentId
   */
  async createPage(post: DocDetail, parentId?: string) {
    const data = this.processBody(post, '', parentId)
    return this.request<WikiPageDetail>('content', { method: 'POST', data })
  }

  /**
   * 更新文章
   * @param post
   * @param id
   * @param version
   */
  async updatePage(post: DocDetail, id: string, version: number) {
    const data = {
      type: 'page',
      title: post.title,
      id,
      space: {
        key: this.config.spaceKey,
      },
      version: {
        number: version,
      },
      body: {
        wiki: {
          value: post.body_wiki,
          representation: 'wiki',
        },
      },
    }
    return await this.request<WikiPageList>(`content/${id}`, { method: 'PUT', data })
  }
}

export default WikiClient
