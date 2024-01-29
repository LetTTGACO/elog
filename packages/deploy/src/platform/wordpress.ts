import {
  cleanParameter,
  generateUniqueId,
  getFileType,
  getPicBufferFromURL,
  getUrlListFromContent,
  out,
} from '@elog/shared'
import WordPressClient, {
  CreateWordPressPost,
  UpdateWordPressPost,
  WordPressConfig,
  WordPressPost,
} from '@elog/sdk-wordpress'
import { DocDetail } from '@elog/types'
import { AdapterClient } from '../adapter'
import { AdapterFunction, DocMap } from '../types'
import { FormatEnum } from '../const'
import { getNoRepValues, removeEmptyProperties } from '../utils/common'

class DeployWordPress {
  config: WordPressConfig
  ctx: WordPressClient
  adapterClient: AdapterClient
  /** 文档处理适配器 */
  adapter: AdapterFunction

  constructor(config: WordPressConfig) {
    this.config = config
    this.ctx = new WordPressClient(config)
    this.adapterClient = new AdapterClient({
      format: FormatEnum.HTML_HIGHLIGHT,
      formatExt: config.formatExt,
    })
    this.adapter = this.adapterClient.getAdapter()
  }

  async deploy(articleList: DocDetail[]) {
    try {
      out.access('正在部署到 WordPress...')
      let tagsKey = 'tags'
      let categoriesKey = 'categories'
      let urlnameKey = 'urlname'
      let coverKey = 'cover'
      let descriptionKey = 'description'
      // 获取keyMap
      if (this.config.keyMap && Object.keys(this.config.keyMap)) {
        tagsKey = this.config.keyMap.tags || tagsKey
        categoriesKey = this.config.keyMap.categories || categoriesKey
        urlnameKey = this.config.keyMap.urlname || urlnameKey
        coverKey = this.config.keyMap.cover || coverKey
        descriptionKey = this.config.keyMap.description || descriptionKey
      }
      // 重新排序articleList，按照层级更新文章
      // 先更新第一级，再更新第二级...
      const sortArticleList = articleList.sort((a, b) => {
        if (!a.catalog || !b.catalog) {
          return 0
        }
        return a.catalog.length - b.catalog.length
      })
      // 获取文章列表
      const postList = await this.ctx.getAllPosts()
      let postMap: DocMap<WordPressPost> = {}
      // List转Map
      postList.forEach((item) => {
        postMap[item.title.rendered] = item
      })
      // 获取wp标签
      const wpTags = await this.ctx.getAllTags()
      // 获取wp分类
      const wpCategories = await this.ctx.getAllCategories()
      // 获取wp媒体
      const wpMedias = await this.ctx.getAllMedia()
      const noRepValues = getNoRepValues(sortArticleList, tagsKey, categoriesKey)
      for (const tag of noRepValues.tags) {
        const wpTag = wpTags.find((t) => t.name === tag)
        if (!wpTag) {
          try {
            const newTag = await this.ctx.createTag({ name: tag })
            wpTags.push(newTag)
          } catch (e: any) {
            out.warning(`创建 ${tag} 标签失败: ${e.message}`)
            out.debug(e)
          }
        }
      }
      for (const category of noRepValues.categories) {
        const wpCategory = wpCategories.find((t) => t.name === category)
        if (!wpCategory) {
          // 如果没有找到，就在wp创建一个
          try {
            const newCategory = await this.ctx.createCategory({ name: category })
            wpCategories.push(newCategory)
          } catch (e: any) {
            out.warning(`创建 ${category} 分类失败: ${e.message}`)
            out.debug(e)
          }
        }
      }

      let publishedPostMap: DocMap<WordPressPost> = {}
      // 根据目录上传到wp上
      for (const articleInfo of sortArticleList) {
        // 重复文档跳过同步
        if (publishedPostMap[articleInfo.properties.title]) {
          out.warning('跳过更新', `存在重复文档：${articleInfo.properties.title}`)
          continue
        }
        // 自定义处理md文档
        articleInfo.body_html = this.adapter(articleInfo) as string
        const post: UpdateWordPressPost | CreateWordPressPost = {
          title: articleInfo.properties.title,
          content: articleInfo.body_html,
          status: 'publish',
          slug: articleInfo.properties[urlnameKey] || articleInfo.properties.title,
          excerpt: articleInfo.properties[descriptionKey],
        }
        const postTags = articleInfo.properties[tagsKey] as string | string[]
        if (postTags?.length) {
          const tags = Array.isArray(postTags) ? postTags : postTags.split(',')
          // 从wpTags中找到对应的tagId
          post.tags = tags.map((tag) => {
            const wpTag = wpTags.find((t) => t.name === tag)!
            return wpTag?.id
          })
        }
        const postCategories = articleInfo.properties[categoriesKey] as string | string[]
        if (postCategories?.length) {
          const categories = Array.isArray(postCategories)
            ? postCategories
            : postCategories.split(',')
          // 从wpCategories中用reduce找到对应的categoryIds
          post.categories = categories.reduce((acc: number[], cur) => {
            const wpCategory = wpCategories.find((t) => t.name === cur)
            if (wpCategory) {
              acc.push(wpCategory.id)
            }
            return acc
          }, [])
        }
        // 处理封面图
        if (articleInfo.properties[coverKey]) {
          const picUrl = articleInfo.properties[coverKey]
          const url = cleanParameter(picUrl)
          const uuid = generateUniqueId(url)
          const fileType = await getFileType(picUrl)
          if (fileType) {
            const filename = `${uuid}.${fileType.type}`
            // 检查是否已经存在图片
            const cacheMedia = wpMedias.find((item) => item.title?.rendered === filename)
            if (cacheMedia) {
              out.info('忽略上传', `图片已存在: ${cacheMedia.guid.rendered}`)
              post.featured_media = cacheMedia.id
            } else {
              const pic = await getPicBufferFromURL(picUrl)
              if (!pic) {
                continue
              }
              // 上传特色图片
              const media = await this.ctx.uploadMedia(pic, filename)
              out.info('上传成功', media.guid.rendered)
              wpMedias.push(media)
              post.featured_media = media.id
              // 替换属性中的图片
              articleInfo.properties[coverKey] = media.guid.rendered
            }
          }
        }
        // 处理文档图片
        if (this.config.needUploadImage) {
          // 收集文档图片
          const urlList = getUrlListFromContent(articleInfo.body)
          for (const image of urlList) {
            // 生成文件名
            const fileName = generateUniqueId(image.url, 28)
            // 生成文件名后缀
            const fileType = await getFileType(image.url)
            if (!fileType) {
              out.warning(
                `${articleInfo?.properties?.title} 存在获取图片类型失败，跳过：${image.url}`,
              )
              continue
            }
            // 完整文件名
            const fullName = `${fileName}.${fileType.type}`
            // 检查是否存在该文件
            const item = wpMedias.find((item) => item.title?.rendered === fullName)
            if (!item) {
              // 上传
              // 获取 buffer
              const buffer = await getPicBufferFromURL(image.original)
              if (!buffer) {
                out.warning(
                  '跳过',
                  `${articleInfo?.properties?.title} 存在获取图片内容失败：${image.url}`,
                )
                continue
              }
              try {
                const attachment = await this.ctx.uploadMedia(buffer, fullName)
                // const imageUrl = await this.ctx.getAttachmentPermalink(attachment.metadata.name)
                out.info('上传成功', attachment.guid.rendered)
                wpMedias.push(attachment)
                // 替换文档中的图片路径
                articleInfo.body = articleInfo.body.replace(
                  image.original,
                  attachment.guid.rendered,
                )
              } catch (e: any) {
                out.warning(
                  '跳过',
                  `${articleInfo?.properties?.title} 存在上传图片失败：${image.url}`,
                )
                out.debug(e)
              }
            } else {
              out.info('忽略上传', `图片已存在: ${item.guid.rendered}`)
              // 替换文档中的图片路径
              articleInfo.body = articleInfo.body.replace(image.original, item.guid.rendered)
            }
          }
        }
        const cachePage = postMap[articleInfo.properties.title]
        if (cachePage) {
          await this.ctx.updatePost(cachePage.id, removeEmptyProperties(post))
          out.info('更新成功', articleInfo.properties.title)
        } else {
          const newPost = await this.ctx.createPost(
            removeEmptyProperties(post) as CreateWordPressPost,
          )
          postMap[newPost.title.rendered] = newPost
          out.info('新增成功', articleInfo.properties.title)
        }
        publishedPostMap[articleInfo.properties.title] = cachePage
      }
      return undefined
    } catch (error: any) {
      out.err('部署到 WordPress 失败: ', error.message)
      out.debug(error)
      process.exit(-1)
    }
  }
}

export default DeployWordPress
