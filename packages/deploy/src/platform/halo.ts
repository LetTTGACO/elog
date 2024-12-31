import HaloClient, { HaloConfig, PostRequest, PostSpecVisibleEnum } from '@elog/sdk-halo'
import { DocDetail } from '@elog/types'
import { AdapterClient } from '../adapter'
import { AdapterFunction, IHaloConfig } from '../types'
import { FormatEnum } from '../const'
import { getNoRepValues } from '../utils/common'
import { slugify } from 'transliteration'
import {
  delay,
  generateUniqueId,
  getFileType,
  getPicBufferFromURL,
  getUrl,
  getUrlListFromContent,
  out,
} from '@elog/shared'

class DeployHalo {
  config: IHaloConfig
  ctx: HaloClient
  adapterClient: AdapterClient
  /** 文档处理适配器 */
  adapter: AdapterFunction

  constructor(config: HaloConfig) {
    this.config = config
    this.ctx = new HaloClient(config)
    this.adapterClient = new AdapterClient({
      format: FormatEnum.HTML,
      formatExt: this.config.formatExt,
    })
    this.adapter = this.adapterClient.getAdapter()
  }

  getIds(items: any, map: any) {
    if (!items) return []
    let list = items
    if (typeof items === 'string') {
      list = [items]
    }
    return list.map((item: any) => {
      return map[item].metadata.name
    })
  }

  async deploy(articleList: DocDetail[], imageClient?: any) {
    out.access('正在部署到 Halo...')
    // 获取文章列表
    const postList = await this.ctx.getPostList()

    let postMap: any = {}
    // List转Map
    postList.items.forEach((item) => {
      postMap[item.post.metadata.name] = item
    })

    let categoryMap: any = {}
    // 获取分类
    const categories = await this.ctx.getCategories()
    // List转Map
    categories.items.forEach((item) => {
      categoryMap[item.spec.displayName] = item
    })

    let tagMap: any = {}
    // 获取标签
    const tags = await this.ctx.getTags()
    // List转Map
    tags.items.forEach((item) => {
      tagMap[item.spec.displayName] = item
    })

    let imageMap: any = {}

    // 获取图片
    const images = await this.ctx.getAttachments()

    images.items.forEach((item) => {
      if (item.spec.displayName) {
        imageMap[item.spec.displayName] = item
      }
    })

    const noRepValues = getNoRepValues(articleList, 'tags', 'categories')
    // 收集文档分类

    for (const [index, category] of noRepValues.categories.entries()) {
      const element = categoryMap[category]
      if (!element) {
        try {
          // 新增 Tag
          const params = {
            spec: {
              displayName: category,
              slug: slugify(category, { trim: true }),
              description: '',
              cover: '',
              template: '',
              priority: categories.items.length + index,
              children: [],
            },
            apiVersion: 'content.halo.run/v1alpha1',
            kind: 'Category',
            metadata: {
              name: '',
              generateName: 'category-',
            },
          }
          const newCategory = await this.ctx.createCategory(params)
          categoryMap[newCategory.spec.displayName] = newCategory
          out.info('新增分类', category)
        } catch (e: any) {
          out.err(`创建 ${category} 分类失败: ${e.message}`)
          out.debug(e)
        }
      }
    }

    // 收集文档标签
    for (const tag of noRepValues.tags) {
      const element = tagMap[tag]
      if (!element) {
        try {
          // 新增 Tag
          const params = {
            spec: {
              displayName: tag,
              slug: slugify(tag, { trim: true }),
              color: '#ffffff',
              cover: '',
            },
            apiVersion: 'content.halo.run/v1alpha1',
            kind: 'Tag',
            metadata: {
              name: '',
              generateName: 'tag-',
            },
          }
          const newTag = await this.ctx.createTag(params)
          tagMap[newTag.spec.displayName] = newTag
          out.info('新增标签', tag)
        } catch (e: any) {
          out.err(`创建 ${tag} 标签失败: ${e.message}`)
          out.debug(e)
        }
      }
    }
    for (let doc of articleList) {
      if (this.config.needUploadImage) {
        // 收集文档图片
        const urlList = getUrlListFromContent(doc.body)
        // 封面图
        const cover = doc.properties.cover
        if (cover) {
          urlList.push(getUrl(cover))
        }
        for (const image of urlList) {
          // 生成文件名
          const fileName = generateUniqueId(image.url, 28)
          // 生成文件名后缀
          const fileType = await getFileType(image.url)
          if (!fileType) {
            out.warning(`${doc?.properties?.title} 存在获取图片类型失败，跳过：${image.url}`)
            continue
          }
          // 完整文件名
          const fullName = `${fileName}.${fileType.type}`
          // 检查Halo是否存在该文件
          const item = imageMap[fullName]
          if (!item) {
            // 上传
            // 获取 buffer
            const buffer = await getPicBufferFromURL(image.original)
            if (!buffer) {
              out.warning('跳过', `${doc?.properties?.title} 存在获取图片内容失败：${image.url}`)
              continue
            }
            try {
              const attachment = await this.ctx.uploadAttachment(buffer, fullName)
              const imageUrl = await this.ctx.getAttachmentPermalink(attachment.metadata.name)
              out.info('上传成功', imageUrl)
              // 记录最新的
              imageMap[fullName] = {
                ...attachment,
                status: {
                  ...attachment.status,
                  permalink: imageUrl,
                },
              }
              // 替换文档中的图片路径
              doc.body = doc.body.replace(image.original, imageUrl)
              // 替换属性中的图片
              if (image.original === cover) {
                doc.properties.cover = imageUrl
              }
            } catch (e: any) {
              out.warning('跳过', `${doc?.properties?.title} 存在上传图片失败：${image.url}`)
              out.debug(e)
            }
          } else {
            out.info('忽略上传', `图片已存在: ${item.status.permalink}`)
            // 替换文档中的图片路径
            doc.body = doc.body.replace(image.original, item.status.permalink)
            // 替换属性中的图片
            if (image.original === cover) {
              doc.properties.cover = item.status.permalink
            }
          }
        }
      }
      // markdown转 Html
      let formatRes = await this.adapter(doc, imageClient)

      if (typeof formatRes === 'string') {
        doc.body_html = formatRes
      } else {
        // DocDetail 类型
        doc.body_html = formatRes.body_html
        doc = formatRes
      }

      // 上传文档
      let params: PostRequest = {
        post: {
          spec: {
            title: '',
            slug: '',
            template: '',
            cover: '',
            deleted: false,
            publish: false,
            publishTime: doc.properties.date
              ? new Date(doc.properties.date).toISOString()
              : new Date().toISOString(),
            pinned: false,
            allowComment: true,
            visible: PostSpecVisibleEnum.Public,
            priority: 0,
            excerpt: {
              autoGenerate: true,
              raw: '',
            },
            categories: [],
            tags: [],
            htmlMetas: [],
          },
          apiVersion: 'content.halo.run/v1alpha1',
          kind: 'Post',
          metadata: {
            name: doc.doc_id,
            creationTimestamp: doc.properties.date
              ? new Date(doc.properties.date).toISOString()
              : new Date().toISOString(),
          },
        },
        content: {
          raw: '',
          content: '',
          rawType: 'html',
        },
      }
      // 判断文档是否存在 halo
      const item = postMap[doc.doc_id]
      if (item) {
        params = item
        params.content = {
          raw: '',
          content: '',
          rawType: 'html',
        }
        // 如果存在日期属性，更新现有帖子的创建时间戳
        if (doc.properties.date) {
          params.post.spec.publishTime = new Date(doc.properties.date).toISOString()
          params.post.metadata.creationTimestamp = new Date(doc.properties.date).toISOString()
        }
      }
      // 覆盖文档标题
      params.post.spec.title = doc.properties.title
      // 覆盖文档slug
      params.post.spec.slug = doc.properties.urlname
      // 覆盖文档封面图
      params.post.spec.cover = doc.properties.cover
      // 覆盖文档摘要
      params.post.spec.excerpt.raw = doc.properties.excerpt
      // 是否自动生成文档摘要
      const autoExcerpt = doc.properties.autoExcerpt
      params.post.spec.excerpt.autoGenerate =
        (typeof autoExcerpt === 'string' && autoExcerpt === 'true') ||
        (typeof autoExcerpt === 'boolean' && autoExcerpt)
      // 覆盖文档是否置顶
      const pinned = doc.properties.pinned
      params.post.spec.pinned =
        (typeof pinned === 'string' && pinned === 'true') || (typeof pinned === 'boolean' && pinned)
      // 覆盖文档是否公开
      if (doc.properties.public === undefined) {
        params.post.spec.visible = PostSpecVisibleEnum.Public
      } else {
        params.post.spec.visible = doc.properties.public
          ? PostSpecVisibleEnum.Public
          : PostSpecVisibleEnum.Private
      }
      // 覆盖文档分类和标签
      const categoryIds = this.getIds(doc.properties.categories, categoryMap)
      const tagIds = this.getIds(doc.properties.tags, tagMap)
      if (doc.properties.tags) {
        params.post.spec.tags = tagIds
      }
      if (doc.properties.categories) {
        params.post.spec.categories = categoryIds
      }
      // 覆盖文档内容
      params.content.content = doc.body_html
      if (this.config.rowType === 'markdown') {
        params.content.raw = doc.body
        params.content.rawType = 'markdown'
      } else {
        params.content.rawType = 'html'
        params.content.raw = doc.body_html
      }
      // 判断文档是否存在 halo
      if (!item) {
        // 不存在，走新增流程
        try {
          await this.ctx.createPost(params)
          out.info('新增文档', doc.properties.title)
        } catch (e: any) {
          out.err(`新增 ${doc.properties.title} 文档失败: ${e.message}`)
          out.debug(e)
        }
        // 发布
      } else {
        try {
          // 走更新流程
          // 更新基本信息
          await this.ctx.updatePostInfo(doc.doc_id, params.post)
          // 手动阻塞 500ms
          await delay()
          // 更新内容信息
          await this.ctx.updatePostContent(doc.doc_id, params.content)
          out.info('更新文档', doc.properties.title)
        } catch (e: any) {
          out.err(`更新 ${doc.properties.title} 文档失败: ${e.message}`)
          out.debug(e)
        }
      }
      // 发布文档
      const publish = doc.properties.publish
      if (
        publish === undefined ||
        (typeof publish === 'string' && publish === 'true') ||
        (typeof publish === 'boolean' && publish)
      ) {
        await this.ctx.publishPost(doc.doc_id)
        out.info('发布文档', doc.properties.title)
      } else {
        await this.ctx.unpublishPost(doc.doc_id)
        out.info('下架文档', doc.properties.title)
      }
    }
  }
}

export default DeployHalo
