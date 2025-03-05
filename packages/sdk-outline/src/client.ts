import { out, request, RequestOptions, getFileType, requestAxios } from '@elog/shared'
import { OutlineResponse, OutlineDoc, OutlineDocListResponse } from './types'
import { DocDetail } from '@elog/types'
import { OutlineConfig } from './types'
import { getProps } from './utils'

/** 默认语雀API 路径 */
const DEFAULT_API_URL = 'https://app.getoutline.com/api'

class OutlineClient {
  config: OutlineConfig
  api: this
  // TODO
  catalog: Omit<OutlineDoc, 'properties'>[] = []
  docList: DocDetail[] = []

  constructor(config: OutlineConfig) {
    this.config = config
    this.config.token = config.token || process.env.OUTLINE_TOKEN!
    if (!this.config.token) {
      out.err('缺少参数', '缺少 API 密钥')
      out.info('请查阅Elog配置文档: https://elog.1874.cool/notion/write-platform')
      process.exit(-1)
    }
    this.api = this
  }

  /**
   * send api request to outline
   * @param api
   * @param reqOpts
   * @param custom
   */
  async request<T>(api: string, reqOpts: RequestOptions, custom?: boolean): Promise<T> {
    const { token } = this.config
    let baseUrl = this.config.baseUrl || DEFAULT_API_URL
    if (baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      baseUrl = baseUrl.slice(0, -1)
    }
    const url = `${baseUrl}/${api}`
    const opts: RequestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      ...reqOpts,
    }
    if (custom) {
      const res = await request<T>(url, opts)
      return res.data
    }
    const res = await request<OutlineResponse<T>>(url, opts)
    if (res.status !== 200) {
      // @ts-ignore
      out.err(res.data?.message || res)
      process.exit()
    }
    return res.data.data
  }

  /**
   * 获取文章列表(不带详情)
   */
  async getDocList() {
    // 获取目录信息
    const list: OutlineDoc[] = []
    const self = this
    const getList = async (offset = 0) => {
      const limit = 100 // 设置分页大小为100
      const data: any = {
        limit,
        offset,
        collectionId: self.config.collectionId,
        userId: self.config.userId,
        backlinkDocumentId: self.config.backlinkDocumentId,
        parentDocumentId: self.config.parentDocumentId,
        template: self.config.isTemplate,
      }
      // 过滤空值
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) {
          delete data[key]
        }
      })
      const res = await self.request<OutlineDocListResponse>(
        'documents.list',
        {
          method: 'POST',
          data,
        },
        true,
      )
      list.push(...res.data)
      if (res.pagination.total > offset + limit) {
        await getList(offset + limit)
      }
    }
    await getList()
    this.docList = list as any
    return list
  }

  /**
   * 获取文章详情列表
   * @param cachedDocs
   * @param ids
   */
  async getDocDetailList(cachedDocs: OutlineDoc[], ids: string[]) {
    let articleList: DocDetail[] = []
    let docs = cachedDocs
    if (ids.length) {
      // 取交集，过滤不需要下载的page
      docs = docs.filter((doc) => {
        const exist = ids.indexOf(doc.id) > -1
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
    docs = docs.map((item, index) => ({ ...item, _index: index + 1 } as OutlineDoc))
    docs.map((doc) => {
      out.info(`下载文档 ${doc._index}/${docs.length}   `, doc.title)
      const timestamp = new Date(doc.updatedAt).getTime()
      // 解析出properties
      const { body, properties } = getProps(doc as any)
      const article: DocDetail = {
        id: doc.id,
        doc_id: doc.id,
        // @ts-ignore
        title: doc.title,
        updated: timestamp,
        body,
        body_original: doc.text,
        properties,
      }
      articleList.push(article)
    })
    out.info('已下载数', String(articleList.length))
    return articleList
  }

  /**
   * 获取资源
   * @param imageUrl
   */
  async getResourceItem(imageUrl: string) {
    if (!imageUrl) return imageUrl
    const urlParams = new URLSearchParams(imageUrl?.split('?')[1])
    const id = urlParams.get('id')
    if (!id) {
      return imageUrl
    }
    let baseUrl = this.config.baseUrl || DEFAULT_API_URL
    if (baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      baseUrl = baseUrl.slice(0, -1)
    }
    const url = `${baseUrl}/attachments.redirect`
    const res = await requestAxios<ArrayBuffer>(url, {
      method: 'POST',
      data: {
        id,
      },
      headers: {
        Authorization: `Bearer ${this.config.token}`,
      },
      responseType: 'arraybuffer',
    })

    const file = await getFileType(res.request.path || '')
    return {
      buffer: res.data,
      type: file?.type,
      name: id + '.' + file?.type,
    }
  }
}

export default OutlineClient
