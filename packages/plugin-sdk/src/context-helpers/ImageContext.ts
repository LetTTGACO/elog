import type { DocDetail } from '../doc';
import type { ImageBaseConfig, ImageSource, ImageUploader, ImageUrl } from '../image';
import type { PluginContext } from '../plugin';
import { asyncPoolFunc } from '../source';
import { ElogBaseContext } from './BaseContext';

interface PropertyImageUrl extends ImageUrl {
  field: string;
}

interface TransformImageOptions {
  urlList: ImageUrl[];
  doc: DocDetail;
  failBack?: (image: ImageUrl) => void;
  imageClient: ImageUploader;
  limit: number;
  ctx: PluginContext;
}

export class ElogImageContext extends ElogBaseContext {
  private readonly imageBaseConfig: ImageBaseConfig;

  constructor(ctx: PluginContext, imageBaseConfig: ImageBaseConfig) {
    super(ctx);
    this.imageBaseConfig = imageBaseConfig;
  }

  async replaceImages(docDetailList: DocDetail[], uploader: ImageUploader, limit?: number) {
    if (this.imageBaseConfig.disable) {
      this.ctx.logger.info('图片替换已禁用');
      return docDetailList;
    }

    return replaceImagesFunc(
      this.ctx,
      docDetailList,
      uploader,
      limit || this.imageBaseConfig.limit || 10,
      this.imageBaseConfig.propertyImageFields,
    );
  }
}

export const replaceImagesFunc = async (
  ctx: PluginContext,
  docDetailList: DocDetail[],
  imageClient: ImageUploader,
  limit: number,
  propertyImageFields: string[] = [],
) => {
  for (const articleInfo of docDetailList) {
    const urlList = ctx.image.getUrlListFromContent(articleInfo.body);
    if (urlList.length) {
      const urls = await transformImagesFunc({
        ctx,
        doc: articleInfo,
        urlList,
        failBack: () => {
          articleInfo.error = 1;
        },
        imageClient,
        limit,
      });
      if (urls?.length) {
        urls.forEach((item) => {
          ctx.logger.info('图片替换', `${item.url}`);
          articleInfo.body = articleInfo.body.replace(item.originalUrl, item.url);
        });
      }
    }

    const propertyUrlList = getUrlListFromProperties(ctx, articleInfo, propertyImageFields);
    if (propertyUrlList.length) {
      const urls = await transformImagesFunc({
        ctx,
        doc: articleInfo,
        urlList: propertyUrlList,
        failBack: () => {
          articleInfo.error = 1;
        },
        imageClient,
        limit,
      });
      for (const item of urls) {
        for (const image of propertyUrlList) {
          if (image.originalUrl === item.originalUrl) {
            ctx.logger.info('图片替换', `${item.url}`);
            articleInfo.properties[image.field] = item.url;
          }
        }
      }
    }
  }
  return docDetailList;
};

const getUrlListFromProperties = (
  ctx: PluginContext,
  doc: DocDetail,
  fields: string[],
): PropertyImageUrl[] => {
  return fields
    .map((field) => {
      const value = doc.properties?.[field];
      if (typeof value !== 'string' || (!value.startsWith('http') && !value.startsWith('data:'))) {
        return undefined;
      }
      const image = value.startsWith('data:')
        ? ({ originalUrl: value, data: value, type: 'base64' } as const)
        : ctx.image.getBaseUrl(value);
      return { ...image, field };
    })
    .filter((item) => item !== undefined);
};

export const transformImagesFunc = async (options: TransformImageOptions) => {
  const { limit, urlList, doc, failBack, imageClient, ctx } = options;

  const promise = async (image: ImageUrl): Promise<ImageSource | undefined> => {
    try {
      const fileName = ctx.image.genUniqueIdFromUrl(image.data);
      const fileType = await ctx.image.getFileType(image.data);
      if (!fileType) {
        if (image.type === 'url') {
          ctx.logger.warn(`${doc?.properties?.title} 存在获取图片类型失败，跳过：${image.data}`);
        } else {
          ctx.logger.warn(`${doc?.properties?.title} 存在获取图片类型失败`);
          failBack?.(image);
        }
        return undefined;
      }

      const fullName = `${fileName}.${fileType.type}`;
      const exist = await imageClient.hasImage(fullName);
      if (exist) {
        ctx.logger.info('忽略上传', `图片已存在: ${exist}`);
        return {
          fileName: fullName,
          originalUrl: image.originalUrl,
          url: exist,
        };
      }

      let buffer: Buffer | undefined;
      if (image.type === 'base64') {
        buffer = ctx.image.getImageDataUrl(image.data)?.buffer;
      } else {
        buffer = await ctx.image.getBufferFromUrl(image.originalUrl);
      }
      if (!buffer) {
        failBack?.(image);
        return undefined;
      }

      let url = await imageClient.uploadImage(fullName, buffer, doc);
      if (!url) {
        if (image.type === 'url') {
          ctx.logger.warn(`${doc?.properties?.title} 存在上传图片失败：${image.data}`);
        } else {
          ctx.logger.warn(`${doc?.properties?.title} 存在上传图片失败`);
        }
        url = image.originalUrl;
      } else {
        ctx.logger.info('上传成功', url);
      }

      return {
        url,
        fileName: fullName,
        originalUrl: image.originalUrl,
      };
    } catch {
      return undefined;
    }
  };

  const toUploadImages = await asyncPoolFunc(limit || 10, urlList, promise);

  return toUploadImages.filter(
    (item) => item?.url && item.url !== item.originalUrl,
  ) as ImageSource[];
};
