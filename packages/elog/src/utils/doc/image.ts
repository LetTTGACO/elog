import { DocDetail } from '../../types/doc';
import { getUrlListFromContent } from '../image';
import out from '../logger';
import { ImageUploader, ImageUrl } from '../../types/image';
import { asyncPoolFunc } from './form';

const uploadImage = async (
  urlList: ImageUrl[],
  doc: DocDetail,
  callback: (image: ImageUrl) => void,
): Promise<ImageUrl[]> => {
  return [];
};

interface ReplaceOptions {
  docList: DocDetail[];
  limit: number;
  hasImageFunc: ImageUploader['hasImage'];
  uploadImageFunc: ImageUploader['uploadImage'];
}
/**
 * 从文档中替换图片
 * @param replaceOptions
 */
export const replaceImagesFunc = async (replaceOptions: ReplaceOptions) => {
  const { docList, uploadImageFunc, hasImageFunc, limit = 3 } = replaceOptions;

  const promise = async (doc: DocDetail) => {
    return new Promise(async (resolve) => {
      const urlList = getUrlListFromContent(doc.body);
      if (urlList.length) {
        // 上传图片
        const urls = await uploadImage(urlList, doc, () => {
          doc.needUpdate = 1;
        });
        if (urls?.length) {
          // 替换文章中的图片
          urls.forEach((item) => {
            out.info('图片替换', `${item.url}`);
            doc.body = doc.body.replace(item.originalUrl, item.url);
          });
          resolve(doc);
        }
      }
    });
  };
  return asyncPoolFunc(limit, docList, promise);
};
