import { ElogImageContext } from '@elog/plugin-sdk';
import type { DocDetail, ImageUploader, PluginContext } from '@elog/plugin-sdk';
import type { ImageLocalConfig } from './types';
import path from 'path';
import fs from 'fs';

export default class ImageClient extends ElogImageContext {
  private readonly config: ImageLocalConfig;

  constructor(config: ImageLocalConfig, ctx: PluginContext) {
    super(ctx, config);
    this.config = config;
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
      if (doc.docStructure) {
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
        this.ctx.logger.warn('文档不存在目录信息，请检查配置');
        prefixKey = this.config.prefixKey || './';
      }
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
      fs.mkdirSync(fullDirPath, { recursive: true });
      const filePath = path.resolve(fullDirPath, imageName);
      fs.writeFileSync(filePath, imgBuffer);
      // 计算root和output的相对路径
      const sysPath = path.join(prefixKey, imageName);
      // 强行替换图片路径为Unix风格的路径，即 /
      return sysPath.split(path.sep).join('/');
    } catch (e: any) {
      this.ctx.logger.warn(e.message);
    }
  }

  /**
   * 处理图片
   * @param docDetailList
   */
  async processImages(docDetailList: DocDetail[]) {
    const uploader: ImageUploader = {
      hasImage: async () => undefined,
      uploadImage: async (fileName, buffer, doc) => {
        return this.writeImageToLocal(buffer, fileName, doc!);
      },
    };
    return super.replaceImages(docDetailList, uploader);
  }
}
