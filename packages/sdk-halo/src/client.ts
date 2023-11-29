import { HaloConfig } from './types'
import { out, request, RequestOptions } from '@elog/shared'
import FormStream from 'formstream'
import {
  Attachment,
  AttachmentList,
  Category,
  CategoryList,
  Content,
  ListedPostList,
  Post,
  PostRequest,
  Tag,
  TagList,
} from '@halo-dev/api-client'

class HaloClient {
  config: HaloConfig
  constructor(config: HaloConfig) {
    this.config = config
    if (!config.endpoint) {
      out.err('缺少参数', '缺少Halo站点地址 endpoint')
      process.exit(-1)
    }
    if (!this.config.token) {
      out.err('缺少参数', '缺少Halo个人令牌 token')
      process.exit(-1)
    }
    if (!this.config.policyName) {
      out.warning('注意', '未指定存储策略，将使用默认策略上传图片')
      this.config.policyName = 'default-policy'
    }
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   */
  async request<T>(api: string, reqOpts: RequestOptions): Promise<T> {
    let baseUrl = this.config.endpoint
    if (baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      baseUrl = baseUrl.slice(0, -1)
    }
    const url = `${baseUrl}${api}`
    const opts: RequestOptions = {
      ...reqOpts,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        ...reqOpts?.headers,
      },
    }
    const res = await request<T>(url, opts)
    if (res.status !== 200 && res.status !== 201) {
      out.debug(res as any)
      // @ts-ignore
      throw new Error(JSON.stringify(res.data))
    }
    return res.data
  }

  /**
   * 获取文档列表
   */
  async getPostList() {
    return this.request<ListedPostList>('/apis/api.console.halo.run/v1alpha1/posts', {
      method: 'GET',
      data: {
        labelSelector: 'content.halo.run/deleted=false',
      },
    })
  }

  /**
   * 获取Categories列表
   */
  async getCategories() {
    return this.request<CategoryList>('/apis/content.halo.run/v1alpha1/categories', {
      method: 'GET',
    })
  }

  /**
   * 新增分类
   */
  async createCategory(params: Category) {
    return this.request<Category>('/apis/content.halo.run/v1alpha1/categories', {
      method: 'POST',
      data: params,
    })
  }

  /**
   * 获取Tags列表
   */
  async getTags() {
    return this.request<TagList>('/apis/content.halo.run/v1alpha1/tags', {
      method: 'GET',
    })
  }

  /**
   * 新增分类
   */
  async createTag(params: Tag) {
    return this.request<Tag>('/apis/content.halo.run/v1alpha1/tags', {
      method: 'POST',
      data: params,
    })
  }

  /**
   * 获取附件列表
   */
  async getAttachments() {
    return this.request<AttachmentList>('/apis/api.console.halo.run/v1alpha1/attachments', {
      method: 'GET',
    })
  }

  /**
   * 上传附件
   */
  async uploadAttachment(buffer: Buffer, filename: string) {
    const form = new FormStream()
    form.buffer('file', buffer, filename)
    form.field('policyName', this.config.policyName || '')
    form.field('groupName', this.config.groupName || '')
    return this.request<Attachment>('/apis/api.console.halo.run/v1alpha1/attachments/upload', {
      method: 'POST',
      stream: form as any,
      headers: form.headers(),
    })
  }

  /**
   * 更新单篇文档内容
   */
  async updatePostContent(docId: string, params: Content) {
    return this.request<Content>(`/apis/api.console.halo.run/v1alpha1/posts/${docId}/content`, {
      method: 'PUT',
      data: params,
    })
  }

  /**
   * 更新单篇文档内容
   */
  async updatePostInfo(docId: string, params: Post) {
    return this.request<Post>(`/apis/content.halo.run/v1alpha1/posts/${docId}`, {
      method: 'PUT',
      data: params,
    })
  }

  /**
   * 新增文档
   */
  async createPost(params: PostRequest) {
    return this.request<PostRequest>('/apis/api.console.halo.run/v1alpha1/posts', {
      method: 'POST',
      data: params,
    })
  }

  /**
   * 发布文档
   */
  async publishPost(docId: string) {
    return this.request<Post>(`/apis/api.console.halo.run/v1alpha1/posts/${docId}/publish`, {
      method: 'PUT',
    })
  }

  /**
   * 取消发布文档
   */
  async unpublishPost(docId: string) {
    return this.request<Post>(`/apis/api.console.halo.run/v1alpha1/posts/${docId}/unpublish`, {
      method: 'PUT',
    })
  }
}

export default HaloClient
