import { out, RequestOptions, request } from '@elog/shared'
import {
  ConfluenceConfig,
  WikiContent,
  WikiPageDetail,
  WikiPageList,
  WikiPageListResponse,
} from './types'
import { DocDetail } from '@elog/types'

class ConfluenceClient {
  config: ConfluenceConfig
  auth: string

  constructor(config: ConfluenceConfig) {
    this.config = config
    if (!config.baseUrl) {
      out.err('缺少参数', '缺少Confluence baseUrl')
      process.exit(-1)
    }
    this.config.user = config.user || process.env.CONFLUENCE_USER!
    this.config.password = config.password || process.env.CONFLUENCE_PASSWORD!
    if (!this.config.user || !this.config.password) {
      out.err('缺少参数', '缺少Confluence账号或密码')
      process.exit(-1)
    }
    this.auth = `${this.config.user}:${this.config.password}`
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
      auth: this.auth,
      ...reqOpts,
    }
    const res = await request<T>(url, opts)
    return res.data
  }

  /**
   * 生成参数
   * @param post
   * @param id
   * @param parentId
   */
  processBody(post: DocDetail, id?: string, parentId?: string) {
    let params: any = {
      type: 'page',
      title: post.properties.title,
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
  async getRootPageList(): Promise<WikiContent[]> {
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
   * 更新文档
   * @param post
   * @param id
   * @param version
   */
  async updatePage(post: DocDetail, id: string, version: number) {
    const data = {
      type: 'page',
      title: post.properties.title,
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

export default ConfluenceClient
