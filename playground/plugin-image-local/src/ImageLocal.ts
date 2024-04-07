import type { DocDetail, PluginContext } from '@elogx-test/elog';
import type { ImageLocalConfig, ImageSource, ImageUrl } from './types';
import path from 'path';
import fs from 'fs';
import { mkdirp } from 'mkdirp';

export default class ImageLocal {
  private readonly config: ImageLocalConfig;
  private readonly ctx: PluginContext;

  constructor(config: ImageLocalConfig, ctx: PluginContext) {
    this.config = config;
    this.ctx = ctx;
  }

  /**
   * 处理图片前缀
   * @param doc
   */
  private getImagePath(doc: DocDetail) {
    // const dirPath = path.resolve(process.cwd(), this.config.outputDir)
    const dirPath = this.config.outputDir;
    let prefixKey = '';
    if (this.config.pathFollowDoc?.enable) {
      // 是否存在目录
      const tocPath = doc.docStructure.map((item) => item.title).join('/');
      const docPath = path.join(this.config.pathFollowDoc.docOutputDir, tocPath);
      // 2.拿到图片输出路径
      // 3.根据文档路径计算图片的相对路径
      // 假如文档路径为 ./docs/首页/首页下的文档.md
      // 图片输出路径为 ./docs/images
      // 图片前缀为../../images
      prefixKey = path.relative(docPath, dirPath);
      // 强行替换图片路径为Unix风格的路径，即 /
      prefixKey = prefixKey.split(path.sep).join('/');
    } else {
      prefixKey = this.config.prefixKey || './';
    }
    return {
      dirPath,
      prefixKey,
    };
  }

  /**
   * 写入图片到本地
   * @param imgBuffer
   * @param imageName
   * @param doc
   */
  private writeImageToLocal(imgBuffer: Buffer, imageName: string, doc: DocDetail) {
    try {
      let { dirPath, prefixKey } = this.getImagePath(doc);
      if (!prefixKey.endsWith('/')) {
        prefixKey = prefixKey + '/';
      }
      const fullDirPath = path.resolve(process.cwd(), dirPath);
      mkdirp.sync(dirPath);
      const filePath = path.resolve(fullDirPath, imageName);
      fs.writeFileSync(filePath, imgBuffer);
      // 计算root和output的相对路径
      const sysPath = path.join(prefixKey, imageName);
      // 强行替换图片路径为Unix风格的路径，即 /
      return sysPath.split(path.sep).join('/');
    } catch (e: any) {
      this.ctx.warn(e.message);
    }
  }

  /**
   * 替换图片
   * @param docDetailList
   */
  async replaceImages(docDetailList: DocDetail[]) {
    // 遍历文章列表
    for (let i = 0; i < docDetailList.length; i++) {
      const articleInfo = docDetailList[i];
      // 获取图片URL列表
      const urlList = this.ctx.imageUtil.getUrlListFromContent(articleInfo.body);
      if (urlList.length) {
        // 上传图片
        const urls = await this.transformImages(urlList, articleInfo, () => {
          // 图片错误
          articleInfo.error = 1;
        });
        if (urls?.length) {
          // 替换文章中的图片
          urls.forEach((item) => {
            this.ctx.info('图片替换', `${item.url}`);
            articleInfo.body = articleInfo.body.replace(item.original, item.url);
          });
        }
      }
    }
    return docDetailList;
  }

  /**
   * 处理图片
   * @param urlList
   * @param doc
   * @param failBack
   */
  private async transformImages(
    urlList: ImageUrl[],
    doc: DocDetail,
    failBack?: (image: ImageUrl) => void,
  ) {
    const toUploadURLs = urlList.map(async (image) => {
      return await new Promise<ImageSource | undefined>(async (resolve) => {
        try {
          // 生成文件名
          const fileName = this.ctx.imageUtil.genUniqueIdFromUrl(image.url);
          // 生成文件名后缀
          const fileType = await this.ctx.imageUtil.getFileType(image.url);
          if (!fileType) {
            this.ctx.warn(`${doc?.properties?.title} 存在获取图片类型失败，跳过：${image.url}`);
            resolve(undefined);
            return;
          }
          // 完整文件名
          const fullName = `${fileName}.${fileType.type}`;
          const buffer = await this.ctx.imageUtil.getBufferFromUrl(image.original);
          if (!buffer) {
            failBack?.(image);
            resolve(undefined);
            return;
          }
          // 上传图片
          resolve({
            buffer,
            fileName: fullName,
            original: image.original,
          });
        } catch (err: any) {
          resolve(undefined);
        }
      });
    });
    const toUploadImages = (await Promise.all(toUploadURLs).then((imgs) =>
      imgs.filter((img) => img !== undefined),
    )) as ImageSource[];
    let output: ImageUrl[] = [];

    for (const img of toUploadImages) {
      let newUrl: string | undefined = '';
      newUrl = this.writeImageToLocal(img.buffer!, img.fileName, doc);
      if (newUrl) {
        output.push({ original: img.original, url: newUrl });
      }
    }
    if (output.length) {
      output
        .filter((item) => item.url && item.url !== item.original)
        .map((item) => {
          return {
            original: item.original,
            url: item.url,
          };
        });
      return output;
    }
  }
}
