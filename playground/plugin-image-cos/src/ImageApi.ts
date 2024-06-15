import { ImageCOSConfig } from './types';
import { ElogBaseContext, PluginContext } from '@elogx-test/elog';
import { formattedPrefix } from './utils';
import COS from 'cos-nodejs-sdk-v5';

export default class COSApi extends ElogBaseContext {
  private readonly config: ImageCOSConfig;
  private readonly api: COS;
  constructor(config: ImageCOSConfig, ctx: PluginContext) {
    super(ctx);
    // 校验Config
    this.config = config;
    // 如果没开拓展点，就从配置文件/环境变量中读取
    this.config = {
      ...this.config,
      SecretId: this.config.secretId,
      SecretKey: this.config.secretKey,
    };
    if (!this.config.SecretId || !this.config.SecretKey) {
      this.ctx.error('缺少腾讯云COS密钥信息');
    }
    this.config.prefixKey = formattedPrefix(this.config.prefixKey);
    this.api = new COS(this.config);
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回undefined
   * @param filename
   */
  async hasImage(filename: string) {
    try {
      await this.api!.headObject({
        Bucket: this.config.bucket, // 存储桶名字（必须）
        Region: this.config.region, // 存储桶所在地域，必须字段
        Key: `${this.config.prefixKey}${filename}`, //  文件名  必须
      });
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}${filename}`;
      }
      return `https://${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${this.config.prefixKey}${filename}`;
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
      const res = await this.api!.putObject({
        Bucket: this.config.bucket, // 存储桶名字（必须）
        Region: this.config.region, // 存储桶所在地域，必须字段
        Key: `${this.config.prefixKey}/${fileName}`, //  文件名  必须
        StorageClass: 'STANDARD', // 上传模式（标准模式）
        Body: buffer, // 上传文件对象
      });
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}${fileName}`;
      }
      return `https://${res.Location}`;
    } catch (e: any) {
      this.ctx.warn('跳过上传', `上传图片失败，请检查: ${e.message}`);
      this.ctx.debug(e);
    }
  }
}
