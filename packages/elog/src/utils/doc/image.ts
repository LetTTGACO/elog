import { DocDetail } from '../../types/doc';
import out from '../logger';
import { genUniqueIdFromUrl, getBufferFromUrl, getFileType, getUrlListFromContent } from '../image';
import { ImageSource, ImageUploader, ImageUrl } from '../../types/image';
import { asyncPoolFunc } from './form';

interface TransformImageOptions {
  urlList: ImageUrl[];
  doc: DocDetail;
  failBack?: (image: ImageUrl) => void;
  imageClient: ImageUploader;
  limit: number;
}

/**
 * 从文档中替换图片
 * @param docDetailList
 * @param imageClient
 * @param limit
 */
export const replaceImagesFunc = async (
  docDetailList: DocDetail[],
  imageClient: ImageUploader,
  limit: number,
) => {
  // 遍历文章列表
  for (let i = 0; i < docDetailList.length; i++) {
    const articleInfo = docDetailList[i];
    // 获取图片URL列表
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
        // 替换文章中的图片
        urls.forEach((item) => {
          out.info('图片替换', `${item.url}`);
          articleInfo.body = articleInfo.body.replace(item.originalUrl, item.url);
        });
      }
    }
  }
  return docDetailList;
};

export const transformImagesFunc = async (options: TransformImageOptions) => {
  const { limit, urlList, doc, failBack, imageClient } = options;

  const promise = async (image: ImageUrl): Promise<ImageSource | undefined> => {
    try {
      // 生成文件名
      const fileName = genUniqueIdFromUrl(image.data);
      // 生成文件名后缀
      const fileType = await getFileType(image.data);
      if (!fileType) {
        if (image.type === 'url') {
          out.warn(`${doc?.properties?.title} 存在获取图片类型失败，跳过：${image.data}`);
        } else {
          out.warn(`${doc?.properties?.title} 存在获取图片类型失败`);
        }
        return undefined;
      }
      // 完整文件名
      const fullName = `${fileName}.${fileType.type}`;
      // 检查图床是否存在图片
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
          // base64 转 buffer
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
        // 上传图片
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

  return toUploadImages.filter(
    (item) => item?.url && item.url !== item.originalUrl,
  ) as ImageSource[];
};
