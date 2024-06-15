import { ImageQiniuConfig } from './types';
import { ElogBaseContext, PluginContext } from '@elogx-test/elog';
import { formattedPrefix } from './utils';
import * as qiniu from 'qiniu';

export default class COSApi extends ElogBaseContext {
  private readonly config: ImageQiniuConfig;
  uploadToken?: string;
  bucketManager?: qiniu.rs.BucketManager;
  formUploader?: qiniu.form_up.FormUploader;
  putExtra?: qiniu.form_up.PutExtra;
  constructor(config: ImageQiniuConfig, ctx: PluginContext) {
    super(ctx);
    // 校验Config
    this.config = config;
    if (!this.config.secretId || !this.config.secretKey) {
      this.ctx.error('缺少七牛云密钥信息');
    }
    if (!this.config.host) {
      this.ctx.error('使用七牛云时，需要指定域名host');
    }
    this.config.prefixKey = formattedPrefix(this.config.prefixKey);
    const mac = new qiniu.auth.digest.Mac(this.config.secretId, this.config.secretKey);
    const putPolicy = new qiniu.rs.PutPolicy({ scope: this.config.bucket }); // 配置
    this.uploadToken = putPolicy.uploadToken(mac); // 获取上传凭证
    const qiniuConfig = new qiniu.conf.Config({
      zone: qiniu.zone[this.config.region as keyof typeof qiniu.zone],
    });
    // 空间对应的机房
    this.formUploader = new qiniu.form_up.FormUploader(qiniuConfig);
    this.bucketManager = new qiniu.rs.BucketManager(mac, qiniuConfig);
    this.putExtra = new qiniu.form_up.PutExtra();
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回undefined
   * @param filename
   */
  async hasImage(filename: string) {
    return await new Promise<string | undefined>((resolve) => {
      this.bucketManager?.stat(
        this.config.bucket,
        `${this.config.prefixKey}${filename}`,
        (err, _respBody, respInfo) => {
          if (err) {
            this.ctx.debug(`检查图片信息时出错: ${err.message}`);
            resolve(undefined);
          } else {
            if (respInfo.statusCode === 200) {
              resolve(`${this.config.host}/${this.config.prefixKey}${filename}`);
            } else {
              this.ctx.debug('检查图片信息时出错');
              this.ctx.debug(respInfo);
              resolve(undefined);
            }
          }
        },
      );
    });
  }

  /**
   * 上传图片到图床
   * @param fileName
   * @param buffer
   */
  async uploadImage(fileName: string, buffer: Buffer) {
    return await new Promise<string | undefined>((resolve) => {
      this.formUploader?.put(
        this.uploadToken!,
        `${this.config.prefixKey}${fileName}`,
        buffer,
        this.putExtra!,
        (respErr, _respBody, respInfo) => {
          if (respErr) {
            this.ctx.debug(`上传图片失败: ${respErr.message}`);
          } else if (respInfo.statusCode === 200) {
            resolve(`${this.config.host}/${this.config.prefixKey}${fileName}`);
          } else {
            this.ctx.debug('上传图片失败');
            this.ctx.debug(respInfo);
            resolve(undefined);
          }
        },
      );
    });
  }
}
