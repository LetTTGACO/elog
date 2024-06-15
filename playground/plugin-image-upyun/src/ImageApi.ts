import { ImageUPYunConfig } from './types';
import { ElogBaseContext, PluginContext } from '@elogx-test/elog';
import { formattedPrefix } from './utils';
import UPYun from 'upyun';

export default class COSApi extends ElogBaseContext {
  private readonly config: ImageUPYunConfig;
  private readonly api: UPYun.Client;
  constructor(config: ImageUPYunConfig, ctx: PluginContext) {
    super(ctx);
    // 校验Config
    this.config = config;
    // 如果没开拓展点，就从配置文件/环境变量中读取
    if (!this.config.user || !this.config.password || !this.config.bucket) {
      this.ctx.error('缺少又拍云配置信息');
    }
    if (!this.config.host) {
      this.ctx.warn(`未指定域名host，将使用测试域名：http://${this.config.bucket}.test.upcdn.net`);
      this.config.host = `http://${this.config.bucket}.test.upcdn.net`;
    }
    this.config.prefixKey = formattedPrefix(this.config.prefixKey);
    this.api = new UPYun.Client(
      new UPYun.Service(this.config.bucket, this.config.user, this.config.password),
    );
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回undefined
   * @param filename
   */
  async hasImage(filename: string) {
    try {
      const res = await this.api.headFile(`${this.config.prefixKey}${filename}`);
      if (res) {
        return `${this.config.host}/${this.config.prefixKey}${filename}`;
      } else {
        return undefined;
      }
    } catch (e: any) {
      this.ctx.debug(`图片不存在: ${e.message}`);
      return undefined;
    }
  }

  /**
   * 上传图片到图床
   * @param fileName
   * @param buffer
   */
  async uploadImage(fileName: string, buffer: Buffer) {
    try {
      const res = await this.api.putFile(`${this.config.prefixKey}${fileName}`, buffer);
      if (res) {
        return `${this.config.host}/${this.config.prefixKey}${fileName}`;
      } else {
        return undefined;
      }
    } catch (e: any) {
      this.ctx.warn(`上传图片失败，请检查: ${e.message}`);
      this.ctx.debug(e);
      return undefined;
    }
  }
}
