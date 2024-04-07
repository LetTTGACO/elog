import { HaloConfig } from './types';
import Context from './Context';
import FormStream from 'formstream';
import type { PluginContext } from '@elogx-test/elog';
import type {
  Attachment,
  AttachmentList,
  Category,
  CategoryList,
  Content,
  ListedPostList,
  Policy,
  Post,
  PostRequest,
  Tag,
  TagList,
} from '@halo-dev/api-client';

export default class HaloApi extends Context {
  config: HaloConfig;
  constructor(config: HaloConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!config.endpoint) {
      this.ctx.error('缺少Halo站点地址 endpoint');
    }
    if (!this.config.token) {
      this.ctx.error('缺少Halo个人令牌 token');
    }
    if (!this.config.policyName) {
      this.ctx.warn('注意', '未指定存储策略，将使用默认策略上传图片');
      this.config.policyName = 'default-policy';
    }
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   */
  async requestInternal<T>(api: string, reqOpts: any): Promise<T> {
    let baseUrl = this.config.endpoint;
    if (baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      baseUrl = baseUrl.slice(0, -1);
    }
    const url = `${baseUrl}${api}`;
    const opts: any = {
      ...reqOpts,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        ...reqOpts?.headers,
      },
    };
    const res = await this.ctx.request<T>(url, opts);
    if (res.status !== 200 && res.status !== 201) {
      this.ctx.error(JSON.stringify(res.data));
    }
    return res.data;
  }

  /**
   * 获取文档列表
   */
  async getPostList() {
    return this.requestInternal<ListedPostList>('/apis/api.console.halo.run/v1alpha1/posts', {
      method: 'GET',
      data: {
        labelSelector: 'content.halo.run/deleted=false',
      },
    });
  }

  /**
   * 获取Categories列表
   */
  async getCategories() {
    return this.requestInternal<CategoryList>('/apis/content.halo.run/v1alpha1/categories', {
      method: 'GET',
    });
  }

  /**
   * 新增分类
   */
  async createCategory(params: Category) {
    return this.requestInternal<Category>('/apis/content.halo.run/v1alpha1/categories', {
      method: 'POST',
      data: params,
    });
  }

  /**
   * 获取Tags列表
   */
  async getTags() {
    return this.requestInternal<TagList>('/apis/content.halo.run/v1alpha1/tags', {
      method: 'GET',
    });
  }

  /**
   * 新增分类
   */
  async createTag(params: Tag) {
    return this.requestInternal<Tag>('/apis/content.halo.run/v1alpha1/tags', {
      method: 'POST',
      data: params,
    });
  }

  /**
   * 获取附件列表
   */
  async getAttachments() {
    return this.requestInternal<AttachmentList>('/apis/api.console.halo.run/v1alpha1/attachments', {
      method: 'GET',
    });
  }

  /**
   * 获取单个附件
   */
  async getAttachment(name: string) {
    return this.requestInternal<Attachment>(`/apis/storage.halo.run/v1alpha1/attachments/${name}`, {
      method: 'GET',
    });
  }

  /**
   * 上传附件
   */
  async uploadAttachment(buffer: Buffer, filename: string) {
    const form = new FormStream();
    form.buffer('file', buffer, filename);
    form.field('policyName', this.config.policyName || '');
    form.field('groupName', this.config.groupName || '');
    return this.requestInternal<Attachment>(
      '/apis/api.console.halo.run/v1alpha1/attachments/upload',
      {
        method: 'POST',
        stream: form as any,
        headers: form.headers(),
      },
    );
  }

  /**
   * 更新单篇文档内容
   */
  async updatePostContent(docId: string, params: Content) {
    return this.requestInternal<Content>(
      `/apis/api.console.halo.run/v1alpha1/posts/${docId}/content`,
      {
        method: 'PUT',
        data: params,
      },
    );
  }

  /**
   * 更新单篇文档内容
   */
  async updatePostInfo(docId: string, params: Post) {
    return this.requestInternal<Post>(`/apis/content.halo.run/v1alpha1/posts/${docId}`, {
      method: 'PUT',
      data: params,
    });
  }

  /**
   * 新增文档
   */
  async createPost(params: PostRequest) {
    return this.requestInternal<PostRequest>('/apis/api.console.halo.run/v1alpha1/posts', {
      method: 'POST',
      data: params,
    });
  }

  /**
   * 发布文档
   */
  async publishPost(docId: string) {
    return this.requestInternal<Post>(
      `/apis/api.console.halo.run/v1alpha1/posts/${docId}/publish`,
      {
        method: 'PUT',
      },
    );
  }

  /**
   * 取消发布文档
   */
  async unpublishPost(docId: string) {
    return this.requestInternal<Post>(
      `/apis/api.console.halo.run/v1alpha1/posts/${docId}/unpublish`,
      {
        method: 'PUT',
      },
    );
  }

  async getPolicy(): Promise<Policy> {
    return this.requestInternal<Policy>(
      `/apis/storage.halo.run/v1alpha1/policies/${this.config.policyName}`,
      {
        method: 'GET',
      },
    );
  }

  /**
   * 获取附件链接
   * @param name
   */
  async getAttachmentPermalink(name: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fetchPermalink = () => {
        this.getAttachment(name)
          .then((response) => {
            const permalink = response.status?.permalink;
            if (permalink) {
              resolve(permalink);
            } else {
              setTimeout(fetchPermalink, 1000);
            }
          })
          .catch((error) => reject(error));
      };
      fetchPermalink();
    });
  }
}
