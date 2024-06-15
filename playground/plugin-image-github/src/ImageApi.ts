import { ImageGithubConfig } from './types';
import { ElogBaseContext, PluginContext } from '@elogx-test/elog';
import { formattedPrefix } from './utils';

export default class COSApi extends ElogBaseContext {
  private readonly config: ImageGithubConfig;
  constructor(config: ImageGithubConfig, ctx: PluginContext) {
    super(ctx);
    // 校验Config
    this.config = config;
    if (!this.config.host) {
      this.ctx.info('未指定加速域名，将使用默认域名：https://raw.githubusercontent.com');
    } else if (this.config.host?.includes('cdn.jsdelivr.net')) {
      // 如果指定了加速域名
      this.config.host = 'https://cdn.jsdelivr.net';
    }
    if (!this.config.token || !this.config.user || !this.config.repo) {
      this.ctx.error('缺少Github 配置信息');
    }
    this.config.prefixKey = formattedPrefix(this.config.prefixKey);
  }

  async _fetch(fileName: string, options: any, base64File?: string) {
    const path = `https://api.github.com/repos/${this.config.user}/${this.config.repo}/contents/${this.config.prefixKey}${fileName}`;
    const data = base64File && {
      message: 'Upload by elog',
      branch: this.config.branch || 'master',
      content: base64File,
    };
    const method = options.method;
    try {
      const result = await this.ctx.request<any>(path, {
        data,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
        method,
      });
      if (result.status === 409) {
        this.ctx.warn('图片上传失败', '由于github并发问题，图片上传失败');
      } else if (result.status === 200 || result.status === 201) {
        if (this.config.host) {
          return `${this.config.host}/gh/${this.config.user}/${this.config.repo}/${this.config.prefixKey}${fileName}`;
        } else if (method === 'GET') {
          return result.data.download_url as string;
        } else {
          return result.data.content.download_url as string;
        }
      } else {
        if (base64File) {
          if (result.data?.message === 'Bad credentials') {
            // token 配置错误
            this.ctx.warn(
              '请求失败',
              'Github Token 配置错误，配置文档：https://elog.1874.cool/notion/gvnxobqogetukays#github',
            );
          } else {
            this.ctx.warn('请求失败', JSON.stringify(result.data));
          }
        } else {
          this.ctx.debug('NOT FOUND', JSON.stringify(result.data));
        }
      }
    } catch (e: any) {
      if (base64File) {
        this.ctx.warn('请求失败', e.message);
        this.ctx.debug(e);
      } else {
        this.ctx.debug(e);
      }
    }
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回undefined
   * @param filename
   */
  async hasImage(filename: string) {
    return await this._fetch(filename, { method: 'GET' });
  }

  /**
   * 上传图片到图床
   * @param fileName
   * @param buffer
   */
  async uploadImage(fileName: string, buffer: Buffer) {
    const base64File = buffer.toString('base64');
    return this._fetch(fileName, { method: 'PUT' }, base64File);
  }
}
