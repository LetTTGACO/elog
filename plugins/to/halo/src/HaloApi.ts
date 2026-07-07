import { HaloConfig } from './types';
import Context from './Context';
import type { PluginContext } from '@elog/plugin-sdk';
import type {
  Category,
  CategoryList,
  Content,
  ListedPostList,
  Post,
  PostRequest,
  Tag,
  TagList,
} from '@halo-dev/api-client';

const LIST_PAGE_SIZE = 100;

interface HaloListPage {
  items: any[];
  hasNext?: boolean;
  last?: boolean;
  page?: number;
  size?: number;
  total?: number;
  totalPages?: number;
}

interface RequestOptions {
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

function hasMorePages(list: HaloListPage, requestedPage: number) {
  if (list.size === 0) return false;
  if (typeof list.totalPages === 'number' && list.totalPages > 0) {
    return requestedPage < list.totalPages;
  }
  if (typeof list.hasNext === 'boolean') return list.hasNext;
  if (typeof list.last === 'boolean') return !list.last;
  if (typeof list.total === 'number' && typeof list.size === 'number') {
    return requestedPage * list.size < list.total;
  }
  return false;
}

export default class HaloApi extends Context {
  config: HaloConfig;
  constructor(config: HaloConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!config.endpoint) {
      this.ctx.logger.error('缺少Halo站点地址 endpoint');
    }
    if (!this.config.token) {
      this.ctx.logger.error('缺少Halo个人令牌 token');
    }
  }

  /**
   * send api request to Halo
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
    const res = await this.ctx.http<T>(url, opts);
    if (typeof res.status !== 'number' || res.status < 200 || res.status >= 300) {
      this.ctx.logger.error(JSON.stringify(res.data));
    }
    return res.data;
  }

  private async requestPagedList<T extends HaloListPage>(
    api: string,
    reqOpts: RequestOptions,
  ): Promise<T> {
    let page = 1;
    let currentPage = await this.requestInternal<T>(api, {
      ...reqOpts,
      data: {
        ...(reqOpts.data ?? {}),
        page,
        size: LIST_PAGE_SIZE,
      },
    });
    const items = [...currentPage.items];

    while (hasMorePages(currentPage, page)) {
      page += 1;
      currentPage = await this.requestInternal<T>(api, {
        ...reqOpts,
        data: {
          ...(reqOpts.data ?? {}),
          page,
          size: LIST_PAGE_SIZE,
        },
      });
      items.push(...currentPage.items);
    }

    return {
      ...currentPage,
      items,
    };
  }

  /**
   * 获取文档列表
   */
  async getPostList() {
    return this.requestPagedList<ListedPostList>('/apis/api.console.halo.run/v1alpha1/posts', {
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
    return this.requestPagedList<CategoryList>('/apis/content.halo.run/v1alpha1/categories', {
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
    return this.requestPagedList<TagList>('/apis/content.halo.run/v1alpha1/tags', {
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
}
