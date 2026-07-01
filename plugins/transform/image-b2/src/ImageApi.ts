import B2 from 'backblaze-b2';
import { ElogBaseContext, formatImagePrefix, PluginContext } from '@elogx-test/elog';
import type { ImageB2Config } from './types';
import { contentTypeForFile, publicUrl } from './utils';

interface B2Bucket {
  bucketId?: string;
}

interface B2File {
  fileName?: string;
}

export default class B2Api extends ElogBaseContext {
  private readonly config: ImageB2Config;
  private readonly api: B2;
  private readonly ready: Promise<void>;
  private bucketId?: string;

  constructor(config: ImageB2Config, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (
      !this.config.applicationKeyId ||
      !this.config.applicationKey ||
      !this.config.bucket ||
      !this.config.host
    ) {
      this.ctx.logger.error('缺少 Backblaze B2 配置信息');
    }
    this.config.prefixKey = formatImagePrefix(this.config.prefixKey);
    this.api = new B2({
      applicationKeyId: this.config.applicationKeyId,
      applicationKey: this.config.applicationKey,
    });
    this.ready = this.init();
  }

  async hasImage(fileName: string) {
    const key = `${this.config.prefixKey}${fileName}`;
    try {
      await this.ready;
      const files = await this.api.listFileNames({
        bucketId: this.getBucketId(),
        startFileName: '',
        maxFileCount: 1,
        delimiter: '',
        prefix: key,
      });
      const file = (files.data?.files as B2File[] | undefined)?.find(
        (item) => item.fileName === key,
      );
      return file?.fileName ? publicUrl(this.config.host, file.fileName) : undefined;
    } catch (e: any) {
      this.ctx.logger.debug(`图床检查出错: ${e.message}`);
    }
  }

  async uploadImage(fileName: string, buffer: Buffer) {
    const fullName = this.fullName(fileName, buffer);
    const key = `${this.config.prefixKey}${fullName}`;
    try {
      await this.ready;
      const uploadUrl = await this.api.getUploadUrl({
        bucketId: this.getBucketId(),
      });
      const file = await this.api.uploadFile({
        uploadUrl: uploadUrl.data.uploadUrl,
        uploadAuthToken: uploadUrl.data.authorizationToken,
        fileName: key,
        data: buffer,
        mime: contentTypeForFile(fullName),
      });
      return publicUrl(this.config.host, file.data.fileName || key);
    } catch (e: any) {
      this.ctx.logger.warn('跳过上传', `上传图片失败，请检查: ${e.message}`);
      this.ctx.logger.debug(e);
    }
  }

  private async init() {
    await this.api.authorize();
    const bucketRes = await this.api.getBucket({ bucketName: this.config.bucket });
    const bucket = (bucketRes.data?.buckets as B2Bucket[] | undefined)?.[0];
    if (!bucket?.bucketId) {
      this.ctx.logger.error(`未找到 Backblaze B2 Bucket: ${this.config.bucket}`);
    }
    this.bucketId = bucket.bucketId;
  }

  private getBucketId() {
    if (!this.bucketId) {
      this.ctx.logger.error(`未找到 Backblaze B2 Bucket: ${this.config.bucket}`);
    }
    return this.bucketId;
  }

  private fullName(fileName: string, buffer: Buffer) {
    if (/\.[a-z0-9]+$/i.test(fileName)) return fileName;
    const fileType = this.ctx.image.getFileTypeFromBuffer(buffer);
    return fileType ? `${fileName}.${fileType.type}` : fileName;
  }
}
