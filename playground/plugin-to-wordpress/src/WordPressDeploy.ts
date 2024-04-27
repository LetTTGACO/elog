import type {
  CreateWordPressPost,
  DocMap,
  UpdateWordPressPost,
  WordPressConfig,
  WordPressPost,
} from './types';
import type { DocDetail, PluginContext } from '@elogx-test/elog';
import WordPressApi from './WordPressApi';
import Context from './Context';
import { getNoRepValues, htmlAdapterWithHighlight, removeEmptyProperties } from './utils';

export default class extends Context {
  private readonly config: WordPressConfig;
  private readonly api: WordPressApi;

  constructor(config: WordPressConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.api = new WordPressApi(config, ctx);
  }

  async deploy(docs: DocDetail[]) {
    if (docs.length === 0) {
      this.ctx.error('没有可部署的文档');
    }
    this.ctx.success('正在部署到 WordPress...');
    const articleList = JSON.parse(JSON.stringify(docs)) as DocDetail[];
    try {
      let tagsKey = 'tags';
      let categoriesKey = 'categories';
      let urlnameKey = 'urlname';
      let coverKey = 'cover';
      let descriptionKey = 'description';
      // 获取keyMap
      if (this.config.keyMap && Object.keys(this.config.keyMap)) {
        tagsKey = this.config.keyMap.tags || tagsKey;
        categoriesKey = this.config.keyMap.categories || categoriesKey;
        urlnameKey = this.config.keyMap.urlname || urlnameKey;
        coverKey = this.config.keyMap.cover || coverKey;
        descriptionKey = this.config.keyMap.description || descriptionKey;
      }
      // 重新排序articleList，按照层级更新文章
      // 先更新第一级，再更新第二级...
      const sortArticleList = articleList.sort((a, b) => {
        if (!a.docStructure || !b.docStructure) {
          return 0;
        }
        return a.docStructure.length - b.docStructure.length;
      });
      // 获取文章列表
      const postList = await this.api.getAllPosts();
      let postMap: DocMap<WordPressPost> = {};
      // List转Map
      postList.forEach((item) => {
        postMap[item.title.rendered] = item;
      });
      // 获取wp标签
      const wpTags = await this.api.getAllTags();
      // 获取wp分类
      const wpCategories = await this.api.getAllCategories();
      // 获取wp媒体
      const wpMedias = await this.api.getAllMedia();
      const noRepValues = getNoRepValues(sortArticleList, tagsKey, categoriesKey);
      for (const tag of noRepValues.tags) {
        const wpTag = wpTags.find((t) => t.name === tag);
        if (!wpTag) {
          try {
            const newTag = await this.api.createTag({ name: tag });
            wpTags.push(newTag);
          } catch (e: any) {
            this.ctx.warn(`创建 ${tag} 标签失败: ${e.message}`);
          }
        }
      }
      for (const category of noRepValues.categories) {
        const wpCategory = wpCategories.find((t) => t.name === category);
        if (!wpCategory) {
          // 如果没有找到，就在wp创建一个
          try {
            const newCategory = await this.api.createCategory({ name: category });
            wpCategories.push(newCategory);
          } catch (e: any) {
            this.ctx.warn(`创建 ${category} 分类失败: ${e.message}`);
          }
        }
      }

      let publishedPostMap: DocMap<WordPressPost> = {};
      // 根据目录上传到wp上
      for (const articleInfo of sortArticleList) {
        // 重复文档跳过同步
        if (publishedPostMap[articleInfo.properties.title]) {
          this.ctx.warn('跳过更新', `存在重复文档：${articleInfo.properties.title}`);
          continue;
        }
        // 自定义处理md文档
        articleInfo.body = htmlAdapterWithHighlight(articleInfo);
        const post: UpdateWordPressPost | CreateWordPressPost = {
          title: articleInfo.properties.title,
          content: articleInfo.body,
          status: 'publish',
          slug: articleInfo.properties[urlnameKey] || articleInfo.properties.title,
          excerpt: articleInfo.properties[descriptionKey],
        };
        const postTags = articleInfo.properties[tagsKey] as string | string[];
        if (postTags?.length) {
          const tags = Array.isArray(postTags) ? postTags : postTags.split(',');
          // 从wpTags中找到对应的tagId
          post.tags = tags.map((tag) => {
            const wpTag = wpTags.find((t) => t.name === tag)!;
            return wpTag?.id;
          });
        }
        const postCategories = articleInfo.properties[categoriesKey] as string | string[];
        if (postCategories?.length) {
          const categories = Array.isArray(postCategories)
            ? postCategories
            : postCategories.split(',');
          // 从wpCategories中用reduce找到对应的categoryIds
          post.categories = categories.reduce((acc: number[], cur) => {
            const wpCategory = wpCategories.find((t) => t.name === cur);
            if (wpCategory) {
              acc.push(wpCategory.id);
            }
            return acc;
          }, []);
        }
        // 处理封面图
        if (articleInfo.properties[coverKey]) {
          const picUrl = articleInfo.properties[coverKey];
          const url = this.ctx.imgUtil.cleanUrlParam(picUrl);
          const uuid = this.ctx.imgUtil.genUniqueIdFromUrl(url);
          const fileType = await this.ctx.imgUtil.getFileType(picUrl);
          if (fileType) {
            const filename = `${uuid}.${fileType.type}`;
            // 检查是否已经存在图片
            const cacheMedia = wpMedias.find((item) => item.title?.rendered === filename);
            if (cacheMedia) {
              this.ctx.info('忽略上传', `图片已存在: ${cacheMedia.guid.rendered}`);
              post.featured_media = cacheMedia.id;
            } else {
              const pic = await this.ctx.imgUtil.getBufferFromUrl(picUrl);
              if (!pic) {
                continue;
              }
              // 上传特色图片
              const media = await this.api.uploadMedia(pic, filename);
              this.ctx.info('上传成功', media.guid.rendered);
              wpMedias.push(media);
              post.featured_media = media.id;
              // 替换属性中的图片
              articleInfo.properties[coverKey] = media.guid.rendered;
            }
          }
        }
        // 处理文档图片
        if (this.config.enableUploadImage) {
          // 收集文档图片
          const urlList = this.ctx.imgUtil.getUrlListFromContent(articleInfo.body);
          for (const image of urlList) {
            // 生成文件名
            const fileName = this.ctx.imgUtil.genUniqueIdFromUrl(image.url, 28);
            // 生成文件名后缀
            const fileType = await this.ctx.imgUtil.getFileType(image.url);
            if (!fileType) {
              this.ctx.warn(
                `${articleInfo?.properties?.title} 存在获取图片类型失败，跳过：${image.url}`,
              );
              continue;
            }
            // 完整文件名
            const fullName = `${fileName}.${fileType.type}`;
            // 检查是否存在该文件
            const item = wpMedias.find((item) => item.title?.rendered === fullName);
            if (!item) {
              // 上传
              // 获取 buffer
              const buffer = await this.ctx.imgUtil.getBufferFromUrl(image.original);
              if (!buffer) {
                this.ctx.warn(
                  '跳过',
                  `${articleInfo?.properties?.title} 存在获取图片内容失败：${image.url}`,
                );
                continue;
              }
              try {
                const attachment = await this.api.uploadMedia(buffer, fullName);
                // const imageUrl = await this.api.getAttachmentPermalink(attachment.metadata.name)
                this.ctx.info('上传成功', attachment.guid.rendered);
                wpMedias.push(attachment);
                // 替换文档中的图片路径
                articleInfo.body = articleInfo.body.replace(
                  image.original,
                  attachment.guid.rendered,
                );
              } catch (e: any) {
                this.ctx.warn(
                  '跳过',
                  `${articleInfo?.properties?.title} 存在上传图片失败：${image.url}`,
                );
                this.ctx.debug(e);
              }
            } else {
              this.ctx.info('忽略上传', `图片已存在: ${item.guid.rendered}`);
              // 替换文档中的图片路径
              articleInfo.body = articleInfo.body.replace(image.original, item.guid.rendered);
            }
          }
        }
        const cachePage = postMap[articleInfo.properties.title];
        if (cachePage) {
          await this.api.updatePost(cachePage.id, removeEmptyProperties(post));
          this.ctx.info('更新成功', articleInfo.properties.title);
        } else {
          const newPost = await this.api.createPost(
            removeEmptyProperties(post) as CreateWordPressPost,
          );
          postMap[newPost.title.rendered] = newPost;
          this.ctx.info('新增成功', articleInfo.properties.title);
        }
        publishedPostMap[articleInfo.properties.title] = cachePage;
      }
      return undefined;
    } catch (error: any) {
      this.ctx.error(`部署到 WordPress 失败: ${error.message}`);
    }
  }
}
