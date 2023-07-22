import {
  WordPressConfig,
  WordPressPost,
  CreateWordPressPost,
  UpdateWordPressPost,
  WordPressCategory,
  WordPressTag,
  WordPressMedia,
  WordPressMediaParams,
} from './types'
import { out } from '@elog/shared'
import WPAPI from 'wpapi'
class WordPressClient {
  config: WordPressConfig
  wpClient: WPAPI
  constructor(config: WordPressConfig) {
    this.config = config
    if (!config.endpoint) {
      out.err('缺少参数', '缺少WordPress endpoint')
      process.exit(-1)
    }
    this.config.username = config.username || process.env.WORDPRESS_USERNAME!
    this.config.password = config.password || process.env.WORDPRESS_PASSWORD!
    if (!this.config.username || !this.config.password) {
      out.err('缺少参数', '缺少WordPress账号或密码')
      process.exit(-1)
    }
    this.wpClient = new WPAPI({
      endpoint: config.endpoint,
      username: config.username,
      password: config.password,
    })
  }

  /**
   * 获取文章列表
   */
  async getPostList(pageSize = 100, page = 1): Promise<WordPressPost[]> {
    return this.wpClient.posts().perPage(pageSize).page(page)
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
        allPosts = allPosts.concat(posts)

        if (posts.length === 100) {
          // 继续获取下一页
          return this.getAllPosts(page + 1, allPosts)
        } else {
          // 已获取到最后一页或没有文章
          return allPosts
        }
      })
      .catch((err) => {
        if (
          err.code === 'rest_post_invalid_page_number' &&
          err.message === '请求的页码大于总页数。'
        ) {
          // 请求页码超过总页数，直接返回所有文章
          return allPosts
        } else {
          out.err('获取文章列表失败', err.message)
          out.debug(err)
        }
      })
  }

  /**
   * 创建文章
   */
  async createPost(post: CreateWordPressPost): Promise<WordPressPost> {
    return this.wpClient.posts().create(post)
  }

  /**
   * 更新文章
   */
  async updatePost(id: number, post: UpdateWordPressPost): Promise<WordPressPost> {
    return this.wpClient.posts().id(id).update(post)
  }

  /**
   * 删除文章
   */
  async deletePost(id: number): Promise<WordPressPost> {
    return this.wpClient.posts().id(id).delete()
  }

  /**
   * 获取标签
   */
  async getTags(): Promise<WordPressTag[]> {
    return this.wpClient.tags()
  }

  /**
   * 新增标签
   */
  async createTag(tag: { name: string }): Promise<WordPressTag> {
    return this.wpClient.tags().create(tag)
  }

  /**
   * 获取分类
   */
  async getCategories(): Promise<WordPressCategory[]> {
    return this.wpClient.categories()
  }

  /**
   * 新增分类
   * WordPress的分类存在父子关系，但是先不支持
   * @param category
   */
  async createCategory(category: { name: string }): Promise<WordPressCategory> {
    return this.wpClient.categories().create(category)
  }

  /**
   * 获取媒体库
   */
  async getMedia(): Promise<WordPressMedia[]> {
    return this.wpClient.media()
  }

  /**
   * 上传媒体
   */
  async uploadMedia(file: Buffer, filename: string): Promise<WordPressMedia> {
    const imageInfo: WordPressMediaParams = {
      title: filename,
      description: 'upload by @elog/sdk-wordpress',
    }
    return this.wpClient
      .media()
      .file(file as any, filename)
      .create(imageInfo)
  }
}

export default WordPressClient
