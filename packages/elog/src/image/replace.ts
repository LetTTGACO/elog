import { DocDetail } from '../types/doc';
import out from '../logging/logger';
import { genUniqueIdFromUrl, getBufferFromUrl, getFileType, getUrlListFromContent } from './index';
import { ImageSource, ImageUploader, ImageUrl } from '../types/image';
import { asyncPoolFunc } from '../doc/download';

interface TransformImageOptions {
  urlList: ImageUrl[];
  doc: DocDetail;
  failBack?: (image: ImageUrl) => void;
  imageClient: ImageUploader;
  limit: number;
}

/**
 * 从文档中替换图片，按文档逐篇处理以便失败状态能回写到对应文档。
 * @param docDetailList
 * @param imageClient
 * @param limit
 */
export const replaceImagesFunc = async (
  docDetailList: DocDetail[],
  imageClient: ImageUploader,
  limit: number,
) => {
  // 文档维度串行处理，避免同一正文被多个异步任务同时修改。
  for (let i = 0; i < docDetailList.length; i++) {
    const articleInfo = docDetailList[i];
    // 每篇文章先解析 Markdown 图片链接，正文中无图片时不触发图床逻辑。
    const urlList = getUrlListFromContent(articleInfo.body);
    if (urlList.length) {
      const urls = await transformImagesFunc({
        doc: articleInfo,
        urlList,
        failBack: () => {
          articleInfo.error = 1;
        },
        imageClient,
        limit,
      });
      if (urls?.length) {
        // 只替换成功产生新地址的图片，失败图片保留原链并通过 error 标记提示缓存状态。
        urls.forEach((item) => {
          out.info('图片替换', `${item.url}`);
          articleInfo.body = articleInfo.body.replace(item.originalUrl, item.url);
        });
      }
    }
  }
  return docDetailList;
};

/** 批量处理单篇文档的图片上传/复用，并返回需要替换到正文的新地址。 */
export const transformImagesFunc = async (options: TransformImageOptions) => {
  const { limit, urlList, doc, failBack, imageClient } = options;

  const promise = async (image: ImageUrl): Promise<ImageSource | undefined> => {
    try {
      // 文件名只依赖清理后的图片内容地址，确保重复运行能命中已有上传。
      const fileName = genUniqueIdFromUrl(image.data);
      // 后缀决定最终对象名，识别失败时不能上传到图床。
      const fileType = await getFileType(image.data);
      if (!fileType) {
        if (image.type === 'url') {
          out.warn(`${doc?.properties?.title} 存在获取图片类型失败，跳过：${image.data}`);
        } else {
          out.warn(`${doc?.properties?.title} 存在获取图片类型失败`);
        }
        return undefined;
      }
      // 完整文件名用于 hasImage 检查，uploadImage 仍沿用历史接口传入无后缀名。
      const fullName = `${fileName}.${fileType.type}`;
      // 图床已存在时直接复用，避免重复上传和产生不稳定 URL。
      let exist = await imageClient.hasImage(fullName);
      if (exist) {
        out.info('忽略上传', `图片已存在: ${exist}`);
        // 图片已存在
        return {
          fileName: fullName,
          originalUrl: image.originalUrl,
          url: exist,
        };
      } else {
        let buffer = null;
        if (image.type === 'base64') {
          // base64 图片不需要网络下载，直接转换为上传 buffer。
          const buffer = Buffer.from(image.data, 'base64');
          if (!buffer) {
            failBack?.(image);
            return undefined;
          }
        } else {
          buffer = await getBufferFromUrl(image.originalUrl);
        }
        if (!buffer) {
          failBack?.(image);
          return undefined;
        }
        // 上传失败时回退原图地址，保持正文可用但不误报替换成功。
        let url = await imageClient.uploadImage(fileName, buffer);
        if (!url) {
          if (image.type === 'url') {
            out.warn(`${doc?.properties?.title} 存在上传图片失败：${image.data}`);
          } else {
            out.warn(`${doc?.properties?.title} 存在上传图片失败`);
          }
          url = image.originalUrl;
        } else {
          out.info('上传成功', url);
        }
        return {
          url: url,
          fileName: fullName,
          originalUrl: image.originalUrl,
        };
      }
    } catch (err: any) {
      return undefined;
    }
  };

  const toUploadImages = await asyncPoolFunc(limit || 10, urlList, promise);

  // 仅返回确实发生地址变化的图片，减少正文 replace 的误操作范围。
  return toUploadImages.filter(
    (item) => item?.url && item.url !== item.originalUrl,
  ) as ImageSource[];
};
