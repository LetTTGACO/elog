import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ElogBaseContext, PluginContext } from '@elog/cli';
import type { ImageR2Config } from './types';
import { contentTypeForFile, publicUrl } from './utils';

export default class R2Api extends ElogBaseContext {
  private readonly config: ImageR2Config;
  private readonly api: S3Client;

  constructor(config: ImageR2Config, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (
      !this.config.accessKeyId ||
      !this.config.secretAccessKey ||
      !this.config.bucket ||
      !this.config.endpoint ||
      !this.config.host
    ) {
      this.ctx.logger.error('缺少 Cloudflare R2 配置信息');
    }
    this.config.prefixKey = this.ctx.image.formatImagePrefix(this.config.prefixKey);
    this.api = new S3Client({
      region: this.config.region || 'auto',
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async hasImage(fileName: string) {
    const key = `${this.config.prefixKey}${fileName}`;
    try {
      await this.api.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      return publicUrl(this.config.host, key);
    } catch (e: any) {
      if (e?.name !== 'NotFound' && e?.$metadata?.httpStatusCode !== 404) {
        this.ctx.logger.debug(`图床检查出错: ${e.message}`);
      }
    }
  }

  async uploadImage(fileName: string, buffer: Buffer) {
    const fullName = this.fullName(fileName, buffer);
    const key = `${this.config.prefixKey}${fullName}`;
    try {
      await this.api.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentTypeForFile(fullName),
        }),
      );
      return publicUrl(this.config.host, key);
    } catch (e: any) {
      this.ctx.logger.warn('跳过上传', `上传图片失败，请检查: ${e.message}`);
      this.ctx.logger.debug(e);
    }
  }

  private fullName(fileName: string, buffer: Buffer) {
    if (/\.[a-z0-9]+$/i.test(fileName)) return fileName;
    const fileType = this.ctx.image.getFileTypeFromBuffer(buffer);
    return fileType ? `${fileName}.${fileType.type}` : fileName;
  }
}
