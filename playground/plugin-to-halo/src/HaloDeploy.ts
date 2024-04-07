import type { HaloConfig } from './types';
import type { DocDetail, PluginContext } from '@elogx-test/elog';
import HaloApi from './HaloApi';
import { slugify } from 'transliteration';
import { delay, getIds, getNoRepValues, htmlAdapter } from './utils';
import type { PostRequest } from '@halo-dev/api-client';
import Context from './Context';

export default class extends Context {
  private readonly config: HaloConfig;
  private readonly api: HaloApi;

  constructor(config: HaloConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    this.api = new HaloApi(config, ctx);
  }

  async deploy(docs: DocDetail[]) {
    if (docs.length === 0) {
      this.ctx.error('没有可部署的文档');
    }
    const docDetailList = JSON.parse(JSON.stringify(docs)) as DocDetail[];

    this.ctx.success('正在部署到 Halo...');
    // 获取文章列表
    const postList = await this.api.getPostList();

    let postMap: any = {};
    // List转Map
    postList.items.forEach((item) => {
      postMap[item.post.metadata.name] = item;
    });

    let categoryMap: any = {};
    // 获取分类
    const categories = await this.api.getCategories();
    // List转Map
    categories.items.forEach((item) => {
      categoryMap[item.spec.displayName] = item;
    });

    let tagMap: any = {};
    // 获取标签
    const tags = await this.api.getTags();
    // List转Map
    tags.items.forEach((item) => {
      tagMap[item.spec.displayName] = item;
    });

    let imageMap: any = {};

    // 获取图片
    const images = await this.api.getAttachments();

    images.items.forEach((item) => {
      if (item.spec.displayName) {
        imageMap[item.spec.displayName] = item;
      }
    });

    const noRepValues = getNoRepValues(docDetailList, 'tags', 'categories');
    // 收集文档分类

    for (const [index, category] of noRepValues.categories.entries()) {
      const element = categoryMap[category];
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
          };
          const newCategory = await this.api.createCategory(params);
          categoryMap[newCategory.spec.displayName] = newCategory;
          this.ctx.info('新增分类', category);
        } catch (e: any) {
          this.ctx.warn(`创建 ${category} 分类失败: ${e.message}`);
        }
      }
    }

    // 收集文档标签
    for (const tag of noRepValues.tags) {
      const element = tagMap[tag];
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
          };
          const newTag = await this.api.createTag(params);
          tagMap[newTag.spec.displayName] = newTag;
          this.ctx.info('新增标签', tag);
        } catch (e: any) {
          this.ctx.warn(`创建 ${tag} 标签失败: ${e.message}`);
        }
      }
    }
    for (let doc of docDetailList) {
      if (this.config.enableUploadImage) {
        // 收集文档图片
        const urlList = this.ctx.imageUtil.getUrlListFromContent(doc.body);
        // 封面图
        const cover = doc.properties.cover;
        if (cover) {
          urlList.push(this.ctx.imageUtil.getBaseUrl(cover));
        }
        for (const image of urlList) {
          // 生成文件名
          const fileName = this.ctx.imageUtil.genUniqueIdFromUrl(image.url, 28);
          // 生成文件名后缀
          const fileType = await this.ctx.imageUtil.getFileType(image.url);
          if (!fileType) {
            this.ctx.warn(`${doc?.properties?.title} 存在获取图片类型失败，跳过：${image.url}`);
            continue;
          }
          // 完整文件名
          const fullName = `${fileName}.${fileType.type}`;
          // 检查Halo是否存在该文件
          const item = imageMap[fullName];
          if (!item) {
            // 上传
            // 获取 buffer
            const buffer = await this.ctx.imageUtil.getBufferFromUrl(image.original);
            if (!buffer) {
              this.ctx.warn('跳过', `${doc?.properties?.title} 存在获取图片内容失败：${image.url}`);
              continue;
            }
            try {
              const attachment = await this.api.uploadAttachment(buffer, fullName);
              const imageUrl = await this.api.getAttachmentPermalink(attachment.metadata.name);
              this.ctx.info('上传成功', imageUrl);
              // 记录最新的
              imageMap[fullName] = {
                ...attachment,
                status: {
                  ...attachment.status,
                  permalink: imageUrl,
                },
              };
              // 替换文档中的图片路径
              doc.body = doc.body.replace(image.original, imageUrl);
              // 替换属性中的图片
              if (image.original === cover) {
                doc.properties.cover = imageUrl;
              }
            } catch (e: any) {
              this.ctx.warn('跳过', `${doc?.properties?.title} 存在上传图片失败：${image.url}`);
              this.ctx.debug(e);
            }
          } else {
            this.ctx.info('忽略上传', `图片已存在: ${item.status.permalink}`);
            // 替换文档中的图片路径
            doc.body = doc.body.replace(image.original, item.status.permalink);
            // 替换属性中的图片
            if (image.original === cover) {
              doc.properties.cover = item.status.permalink;
            }
          }
        }
      }
      // markdown转 Html
      const mdBody = doc.body;
      doc.body = htmlAdapter(doc);

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
            pinned: false,
            allowComment: true,
            visible: 'PUBLIC',
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
            name: doc.id,
          },
        },
        content: {
          raw: '',
          content: '',
          rawType: 'html',
        },
      };
      // 判断文档是否存在 halo
      const item = postMap[doc.id];
      if (item) {
        params = item;
        params.content = {
          raw: '',
          content: '',
          rawType: 'html',
        };
      }
      // 覆盖文档标题
      params.post.spec.title = doc.properties.title;
      // 覆盖文档slug
      params.post.spec.slug = doc.properties.urlname;
      // 覆盖文档封面图
      params.post.spec.cover = doc.properties.cover;
      // 覆盖文档摘要
      params.post.spec.excerpt.raw = doc.properties.excerpt;
      // 是否自动生成文档摘要
      const autoExcerpt = doc.properties.autoExcerpt;
      params.post.spec.excerpt.autoGenerate =
        (typeof autoExcerpt === 'string' && autoExcerpt === 'true') ||
        (typeof autoExcerpt === 'boolean' && autoExcerpt);
      // 覆盖文档是否置顶
      const pinned = doc.properties.pinned;
      params.post.spec.pinned =
        (typeof pinned === 'string' && pinned === 'true') ||
        (typeof pinned === 'boolean' && pinned);
      // 覆盖文档是否公开
      if (doc.properties.public === undefined) {
        params.post.spec.visible = 'PUBLIC';
      } else {
        params.post.spec.visible = doc.properties.public ? 'PUBLIC' : 'PRIVATE';
      }
      // 覆盖文档分类和标签
      const categoryIds = getIds(doc.properties.categories, categoryMap);
      const tagIds = getIds(doc.properties.tags, tagMap);
      if (doc.properties.tags) {
        params.post.spec.tags = tagIds;
      }
      if (doc.properties.categories) {
        params.post.spec.categories = categoryIds;
      }
      // 覆盖文档内容
      params.content.content = doc.body;
      if (this.config.rowType === 'markdown') {
        params.content.raw = mdBody;
        params.content.rawType = 'markdown';
      } else {
        params.content.rawType = 'html';
        params.content.raw = doc.body;
      }
      // 判断文档是否存在 halo
      if (!item) {
        // 不存在，走新增流程
        try {
          await this.api.createPost(params);
          this.ctx.info('新增文档', doc.properties.title);
        } catch (e: any) {
          this.ctx.warn(`新增 ${doc.properties.title} 文档失败: ${e.message}`);
        }
        // 发布
      } else {
        try {
          // 走更新流程
          // 更新基本信息
          await this.api.updatePostInfo(doc.id, params.post);
          // 手动阻塞 500ms
          await delay();
          // 更新内容信息
          await this.api.updatePostContent(doc.id, params.content);
          this.ctx.info('更新文档', doc.properties.title);
        } catch (e: any) {
          this.ctx.warn(`更新 ${doc.properties.title} 文档失败: ${e.message}`);
          this.ctx.debug(e);
        }
      }
      // 发布文档
      const publish = doc.properties.publish;
      if (
        publish === undefined ||
        (typeof publish === 'string' && publish === 'true') ||
        (typeof publish === 'boolean' && publish)
      ) {
        await this.api.publishPost(doc.id);
        this.ctx.info('发布文档', doc.properties.title);
      } else {
        await this.api.unpublishPost(doc.id);
        this.ctx.info('下架文档', doc.properties.title);
      }
    }
  }
}
