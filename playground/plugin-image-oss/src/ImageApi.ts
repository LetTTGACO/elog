import { ImageOSSConfig } from './types';
import { ElogBaseContext, PluginContext } from '@elogx-test/elog';
import { formattedPrefix } from './utils';
import OSS from 'ali-oss';

export default class COSApi extends ElogBaseContext {
  private readonly config: ImageOSSConfig;
  private readonly api: OSS;
  constructor(config: ImageOSSConfig, ctx: PluginContext) {
    super(ctx);
    // 校验Config
    this.config = config;
    // 如果没开拓展点，就从配置文件/环境变量中读取
    this.config = {
      ...this.config,
      accessKeyId: this.config.secretId,
      accessKeySecret: this.config.secretKey,
    };
    if (!this.config.accessKeyId || !this.config.accessKeySecret) {
      this.ctx.error('缺少腾讯云COS密钥信息');
    }
    this.config.prefixKey = formattedPrefix(this.config.prefixKey);
    this.api = new OSS(this.config);
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回undefined
   * @param filename
   */
  async hasImage(filename: string) {
    try {
      await this.api!.head(`${this.config.prefixKey}${filename}`);
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}${filename}`;
      }
      return `https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${this.config.prefixKey}${filename}`;
    } catch (e: any) {
      this.ctx.debug(`图床检查出错: ${e.message}`);
    }
  }

  /**
   * 上传图片到图床
   * @param fileName
   * @param buffer
   */
  async uploadImage(fileName: string, buffer: Buffer) {
    try {
      const res = await this.api!.put(`${this.config.prefixKey}${fileName}`, buffer);
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}${fileName}`;
      }
      return res!.url;
    } catch (e: any) {
      this.ctx.warn('跳过上传', `上传图片失败，请检查: ${e.message}`);
      this.ctx.debug(e);
    }
  }
}
