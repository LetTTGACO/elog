import {
  CreateWordPressPost,
  UpdateWordPressPost,
  WordPressCategory,
  WordPressConfig,
  WordPressMedia,
  WordPressPost,
  WordPressTag,
} from './types';
import Context from './Context';
import type { PluginContext } from '@elogx-test/elog';

export default class WordPressApi extends Context {
  config: WordPressConfig;

  constructor(config: WordPressConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!config.endpoint) {
      this.ctx.logger.error('缺少WordPress endpoint');
    }
    if (!this.config.username || !this.config.password) {
      this.ctx.logger.error('缺少WordPress账号或密码');
    }
  }

  private get baseUrl() {
    return this.config.endpoint.replace(/\/$/, '');
  }

  private get authHeader() {
    return `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString(
      'base64',
    )}`;
  }

  private async requestInternal<T>(api: string, reqOpts: any = {}): Promise<T> {
    const res = await this.ctx.http<T>(`${this.baseUrl}${api}`, {
      ...reqOpts,
      headers: {
        Authorization: this.authHeader,
        ...reqOpts.headers,
      },
    });
    if (res.status >= 200 && res.status < 300) {
      return res.data;
    }
    const data = res.data as { code?: string; message?: string };
    const error = Object.assign(new Error(data?.message || JSON.stringify(res.data)), data);
    throw error;
  }

  /**
   * 获取文章列表
   */
  async getPostList(pageSize = 100, page = 1): Promise<WordPressPost[]> {
    return this.requestInternal<WordPressPost[]>('/wp/v2/posts', {
      method: 'GET',
      data: { per_page: pageSize, page },
    });
  }

  /**
   * 获取所有文章
   * @param page
   * @param allPosts
   */
  async getAllPosts(page = 1, allPosts: WordPressPost[] = []): Promise<WordPressPost[]> {
    return this.getPostList(100, page)
      .then((posts) => {
        allPosts = allPosts.concat(posts);
        if (posts.length === 100) {
          return this.getAllPosts(page + 1, allPosts);
        }
        return allPosts;
      })
      .catch((err) => {
        if (err.code === 'rest_post_invalid_page_number') {
          return allPosts;
        } else {
          this.ctx.logger.error(`获取文章列表失败: ${err.message}`);
        }
      });
  }

  /**
   * 创建文章
   */
  async createPost(post: CreateWordPressPost): Promise<WordPressPost> {
    return this.requestInternal<WordPressPost>('/wp/v2/posts', {
      method: 'POST',
      data: post,
    });
  }

  /**
   * 更新文章
   */
  async updatePost(id: number, post: UpdateWordPressPost): Promise<WordPressPost> {
    return this.requestInternal<WordPressPost>(`/wp/v2/posts/${id}`, {
      method: 'POST',
      data: post,
    });
  }

  /**
   * 删除文章
   */
  async deletePost(id: number): Promise<WordPressPost> {
    return this.requestInternal<WordPressPost>(`/wp/v2/posts/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * 获取标签
   */
  async getTags(): Promise<WordPressTag[]> {
    return this.requestInternal<WordPressTag[]>('/wp/v2/tags', { method: 'GET' });
  }

  /**
   * 获取全部标签
   */
  async getAllTags(page = 1, allTags: WordPressTag[] = []): Promise<WordPressTag[]> {
    return this.requestInternal<WordPressTag[]>('/wp/v2/tags', {
      method: 'GET',
      data: { per_page: 100, page },
    })
      .then((tags) => {
        if (tags.length === 0) return allTags;
        allTags = allTags.concat(tags);
        if (tags.length === 100) {
          return this.getAllTags(page + 1, allTags);
        }
        return allTags;
      })
      .catch((err) => {
        if (err.code === 'rest_post_invalid_page_number') {
          return allTags;
        } else {
          this.ctx.logger.error(`获取标签列表失败: ${err.message}`);
        }
      });
  }

  /**
   * 新增标签
   */
  async createTag(tag: { name: string }): Promise<WordPressTag> {
    return this.requestInternal<WordPressTag>('/wp/v2/tags', {
      method: 'POST',
      data: tag,
    });
  }

  /**
   * 获取分类
   */
  async getCategories(): Promise<WordPressCategory[]> {
    return this.requestInternal<WordPressCategory[]>('/wp/v2/categories', { method: 'GET' });
  }

  /**
   * 获取全部分类
   */
  async getAllCategories(
    page = 1,
    allCategories: WordPressCategory[] = [],
  ): Promise<WordPressCategory[]> {
    return this.requestInternal<WordPressCategory[]>('/wp/v2/categories', {
      method: 'GET',
      data: { per_page: 100, page },
    })
      .then((categories) => {
        if (categories.length === 0) return allCategories;
        allCategories = allCategories.concat(categories);
        if (categories.length === 100) {
          return this.getAllCategories(page + 1, allCategories);
        }
        return allCategories;
      })
      .catch((err) => {
        if (err.code === 'rest_post_invalid_page_number') {
          return allCategories;
        } else {
          this.ctx.logger.error(`获取分类列表失败: ${err.message}`);
        }
      });
  }

  /**
   * 新增分类
   * WordPress的分类存在父子关系，但是先不支持
   * @param category
   */
  async createCategory(category: { name: string }): Promise<WordPressCategory> {
    return this.requestInternal<WordPressCategory>('/wp/v2/categories', {
      method: 'POST',
      data: category,
    });
  }

  /**
   * 获取媒体库
   */
  async getMedia(): Promise<WordPressMedia[]> {
    return this.requestInternal<WordPressMedia[]>('/wp/v2/media', { method: 'GET' });
  }

  /**
   * 获取全部媒体库
   */
  async getAllMedia(page = 1, allMedia: WordPressMedia[] = []): Promise<WordPressMedia[]> {
    return this.requestInternal<WordPressMedia[]>('/wp/v2/media', {
      method: 'GET',
      data: { per_page: 100, page },
    })
      .then((medias) => {
        allMedia = allMedia.concat(medias);
        if (medias.length === 100) {
          return this.getAllMedia(page + 1, allMedia);
        }
        return allMedia;
      })
      .catch((err) => {
        if (err.code === 'rest_post_invalid_page_number') {
          return allMedia;
        } else {
          this.ctx.logger.error(`获取图片列表失败: ${err.message}`);
        }
      });
  }

  /**
   * 上传媒体
   */
  async uploadMedia(file: Buffer, filename: string): Promise<WordPressMedia> {
    const form = new FormData();
    form.set('file', new Blob([file]), filename);
    form.set('title', filename);
    form.set('description', 'upload by elog');
    return this.requestInternal<WordPressMedia>('/wp/v2/media', {
      method: 'POST',
      body: form,
    });
  }
}
