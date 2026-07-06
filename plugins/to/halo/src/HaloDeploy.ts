import type { HaloConfig } from './types';
import type { DocDetail, PluginContext } from '@elog/cli';
import HaloApi from './HaloApi';
import { slugify } from 'transliteration';
import { delay, getIds, getNoRepValues } from './utils';
import type { PostRequest } from '@halo-dev/api-client';
import Context from './Context';

function readBoolean(value: unknown, defaultValue: boolean) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(value);
}

function getPostDate(doc: DocDetail, warn: PluginContext['logger']['warn']) {
  const value = doc.properties.date;
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    warn(`${doc.properties.title} 文档日期无效，跳过日期同步: ${value}`);
    return undefined;
  }
  return date.toISOString();
}

function assertHtmlBodyTypes(docs: DocDetail[], error: PluginContext['logger']['error']) {
  for (const doc of docs) {
    const bodyType = doc.bodyType ?? 'markdown';
    if (bodyType !== 'html') {
      error(
        `Halo target expects HTML Document Body, received ${bodyType} for ${doc.properties.title}. Add the Markdown-to-HTML Body Transform before deploying to Halo.`,
      );
    }
  }
}

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
      this.ctx.logger.error('没有可部署的文档');
    }
    assertHtmlBodyTypes(docs, this.ctx.logger.error);
    const docDetailList = JSON.parse(JSON.stringify(docs)) as DocDetail[];

    this.ctx.logger.success('正在部署到 Halo...');
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
          this.ctx.logger.info('新增分类', category);
        } catch (e: any) {
          this.ctx.logger.warn(`创建 ${category} 分类失败: ${e.message}`);
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
          this.ctx.logger.info('新增标签', tag);
        } catch (e: any) {
          this.ctx.logger.warn(`创建 ${tag} 标签失败: ${e.message}`);
        }
      }
    }
    for (let doc of docDetailList) {
      if (this.config.enableUploadImage ?? this.config.needUploadImage) {
        // 收集文档图片
        const urlList = this.ctx.image.getUrlListFromContent(doc.body);
        // 封面图
        const cover = doc.properties.cover;
        if (cover) {
          urlList.push(this.ctx.image.getBaseUrl(cover));
        }
        for (const image of urlList) {
          // 生成文件名
          const fileName = this.ctx.image.genUniqueIdFromUrl(image.data, 28);
          // 生成文件名后缀
          const fileType = await this.ctx.image.getFileType(image.data);
          if (!fileType) {
            this.ctx.logger.warn(
              `${doc?.properties?.title} 存在获取图片类型失败，跳过：${image.data}`,
            );
            continue;
          }
          // 完整文件名
          const fullName = `${fileName}.${fileType.type}`;
          // 检查Halo是否存在该文件
          const item = imageMap[fullName];
          if (!item) {
            // 上传
            // 获取 buffer
            const buffer = await this.ctx.image.getBufferFromUrl(image.originalUrl);
            if (!buffer) {
              this.ctx.logger.warn(
                '跳过',
                `${doc?.properties?.title} 存在获取图片内容失败：${image.data}`,
              );
              continue;
            }
            try {
              const attachment = await this.api.uploadAttachment(buffer, fullName);
              const imageUrl = await this.api.getAttachmentPermalink(attachment.metadata.name);
              this.ctx.logger.info('上传成功', imageUrl);
              // 记录最新的
              imageMap[fullName] = {
                ...attachment,
                status: {
                  ...attachment.status,
                  permalink: imageUrl,
                },
              };
              // 替换文档中的图片路径
              doc.body = doc.body.replace(image.originalUrl, imageUrl);
              // 替换属性中的图片
              if (image.originalUrl === cover) {
                doc.properties.cover = imageUrl;
              }
            } catch (e: any) {
              this.ctx.logger.warn(
                '跳过',
                `${doc?.properties?.title} 存在上传图片失败：${image.data}`,
              );
              this.ctx.logger.debug(e);
            }
          } else {
            this.ctx.logger.info('忽略上传', `图片已存在: ${item.status.permalink}`);
            // 替换文档中的图片路径
            doc.body = doc.body.replace(image.originalUrl, item.status.permalink);
            // 替换属性中的图片
            if (image.originalUrl === cover) {
              doc.properties.cover = item.status.permalink;
            }
          }
        }
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
      params.post.spec.excerpt.autoGenerate = readBoolean(
        doc.properties.autoExcerpt,
        params.post.spec.excerpt.autoGenerate ?? true,
      );
      // 覆盖文档是否置顶
      params.post.spec.pinned = readBoolean(doc.properties.pinned, false);
      // 覆盖文档是否公开
      params.post.spec.visible = readBoolean(doc.properties.public, true) ? 'PUBLIC' : 'PRIVATE';
      // 覆盖文档分类和标签
      const categoryIds = getIds(doc.properties.categories, categoryMap, (category) =>
        this.ctx.logger.warn(`${category} 分类不存在，已跳过该文档关联`),
      );
      const tagIds = getIds(doc.properties.tags, tagMap, (tag) =>
        this.ctx.logger.warn(`${tag} 标签不存在，已跳过该文档关联`),
      );
      if (doc.properties.tags) {
        params.post.spec.tags = tagIds;
      }
      if (doc.properties.categories) {
        params.post.spec.categories = categoryIds;
      }
      // 覆盖文档内容
      params.content.content = doc.body;
      const hasRawBody = doc.rawBody !== undefined;
      params.content.raw = hasRawBody ? doc.rawBody! : doc.body;
      params.content.rawType = hasRawBody ? (doc.rawBodyType ?? 'markdown') : 'html';
      const postDate = getPostDate(doc, this.ctx.logger.warn);
      if (postDate) {
        params.post.metadata.creationTimestamp = postDate;
        params.post.spec.publishTime = postDate;
      }
      const shouldPublish = readBoolean(doc.properties.publish, true);
      params.post.spec.publish = shouldPublish;
      // 判断文档是否存在 halo
      let saved = false;
      if (!item) {
        // 不存在，走新增流程
        try {
          await this.api.createPost(params);
          this.ctx.logger.info('新增文档', doc.properties.title);
          saved = true;
        } catch (e: any) {
          this.ctx.logger.warn(`新增 ${doc.properties.title} 文档失败: ${e.message}`);
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
          this.ctx.logger.info('更新文档', doc.properties.title);
          saved = true;
        } catch (e: any) {
          this.ctx.logger.warn(`更新 ${doc.properties.title} 文档失败: ${e.message}`);
          this.ctx.logger.debug(e);
        }
      }
      if (!saved) {
        continue;
      }
      // 发布文档
      if (shouldPublish) {
        await this.api.publishPost(doc.id);
        this.ctx.logger.info('发布文档', doc.properties.title);
      } else {
        await this.api.unpublishPost(doc.id);
        this.ctx.logger.info('下架文档', doc.properties.title);
      }
    }
  }
}
