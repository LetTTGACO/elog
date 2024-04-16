import {
  CreateWordPressPost,
  UpdateWordPressPost,
  WordPressCategory,
  WordPressConfig,
  WordPressMedia,
  WordPressMediaParams,
  WordPressPost,
  WordPressTag,
} from './types';
import Context from './Context';
import type { PluginContext } from '@elogx-test/elog';
import WPAPI from 'wpapi';

export default class WordPressApi extends Context {
  config: WordPressConfig;
  wpClient: WPAPI;

  constructor(config: WordPressConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!config.endpoint) {
      this.ctx.error('缺少WordPress endpoint');
    }
    if (!this.config.username || !this.config.password) {
      this.ctx.error('缺少WordPress账号或密码');
    }
    this.wpClient = new WPAPI({
      endpoint: config.endpoint,
      username: config.username,
      password: config.password,
    });
  }

  /**
   * 获取文章列表
   */
  async getPostList(pageSize = 100, page = 1): Promise<WordPressPost[]> {
    return this.wpClient.posts().perPage(pageSize).page(page);
  }

  /**
   * 获取所有文章
   * @param page
   * @param allPosts
   */
  async getAllPosts(page = 1, allPosts: WordPressPost[] = []): Promise<WordPressPost[]> {
    return this.wpClient
      .posts()
      .perPage(100)
      .page(page)
      .then((posts) => {
        // 将当前页面的文章合并到所有文章数组中
        allPosts = allPosts.concat(posts);

        if (posts.length === 100) {
          // 继续获取下一页
          return this.getAllPosts(page + 1, allPosts);
        } else {
          // 已获取到最后一页或没有文章
          return allPosts;
        }
      })
      .catch((err) => {
        if (err.code === 'rest_post_invalid_page_number') {
          // 请求页码超过总页数，直接返回所有文章
          return allPosts;
        } else {
          this.ctx.error(`获取文章列表失败: ${err.message}`);
        }
      });
  }

  /**
   * 创建文章
   */
  async createPost(post: CreateWordPressPost): Promise<WordPressPost> {
    return this.wpClient.posts().create(post);
  }

  /**
   * 更新文章
   */
  async updatePost(id: number, post: UpdateWordPressPost): Promise<WordPressPost> {
    return this.wpClient.posts().id(id).update(post);
  }

  /**
   * 删除文章
   */
  async deletePost(id: number): Promise<WordPressPost> {
    return this.wpClient.posts().id(id).delete();
  }

  /**
   * 获取标签
   */
  async getTags(): Promise<WordPressTag[]> {
    return this.wpClient.tags();
  }

  /**
   * 获取全部标签
   */
  async getAllTags(page = 1, allTags: WordPressTag[] = []): Promise<WordPressTag[]> {
    return this.wpClient
      .tags()
      .perPage(100)
      .page(page)
      .then((tags) => {
        if (tags.length === 0) return allTags;
        // 将当前页面的标签合并到所有标签数组中
        allTags = allTags.concat(tags);

        if (tags.length === 100) {
          // 继续获取下一页
          return this.getAllTags(page + 1, allTags);
        } else {
          // 已获取到最后一页或没有标签
          return allTags;
        }
      })
      .catch((err) => {
        this.ctx.error(`获取标签列表失败${err.message}`);
      });
  }

  /**
   * 新增标签
   */
  async createTag(tag: { name: string }): Promise<WordPressTag> {
    return this.wpClient.tags().create(tag);
  }

  /**
   * 获取分类
   */
  async getCategories(): Promise<WordPressCategory[]> {
    return this.wpClient.categories();
  }

  /**
   * 获取全部分类
   */
  async getAllCategories(
    page = 1,
    allCategories: WordPressCategory[] = [],
  ): Promise<WordPressCategory[]> {
    return this.wpClient
      .categories()
      .perPage(100)
      .page(page)
      .then((categories) => {
        if (categories.length === 0) return allCategories;
        // 将当前页面的分类合并到所有分类数组中
        allCategories = allCategories.concat(categories);

        if (categories.length === 100) {
          // 继续获取下一页
          return this.getAllCategories(page + 1, allCategories);
        } else {
          // 已获取到最后一页或没有分类
          return allCategories;
        }
      })
      .catch((err) => {
        this.ctx.error(`获取分类列表失败: ${err.message}`);
      });
  }

  /**
   * 新增分类
   * WordPress的分类存在父子关系，但是先不支持
   * @param category
   */
  async createCategory(category: { name: string }): Promise<WordPressCategory> {
    return this.wpClient.categories().create(category);
  }

  /**
   * 获取媒体库
   */
  async getMedia(): Promise<WordPressMedia[]> {
    return this.wpClient.media();
  }

  /**
   * 获取全部媒体库
   */
  async getAllMedia(page = 1, allMedia: WordPressMedia[] = []): Promise<WordPressMedia[]> {
    return this.wpClient
      .media()
      .perPage(100)
      .page(page)
      .then((medias) => {
        // 将当前页面的文章合并到所有媒体数组中
        allMedia = allMedia.concat(medias);

        if (medias.length === 100) {
          // 继续获取下一页
          return this.getAllMedia(page + 1, allMedia);
        } else {
          // 已获取到最后一页或没有媒体
          return allMedia;
        }
      })
      .catch((err) => {
        if (err.code === 'rest_post_invalid_page_number') {
          // 请求页码超过总页数，直接返回所有媒体
          return allMedia;
        } else {
          this.ctx.error(`获取图片列表失败: ${err.message}`);
        }
      });
  }

  /**
   * 上传媒体
   */
  async uploadMedia(file: Buffer, filename: string): Promise<WordPressMedia> {
    const imageInfo: WordPressMediaParams = {
      title: filename,
      description: 'upload by elog',
    };
    return this.wpClient
      .media()
      .file(file as any, filename)
      .create(imageInfo);
  }
}
