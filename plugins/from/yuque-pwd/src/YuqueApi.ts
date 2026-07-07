import { YuqueCatalog, YuqueDoc, YuqueWithPwdConfig } from './types';
import { ElogBaseContext, PluginContext } from '@elog/plugin-sdk';
import { encrypt } from './utils';
import { JSDOM } from 'jsdom';

export default class YuqueApi extends ElogBaseContext {
  private config: YuqueWithPwdConfig;
  private yuqueCookie: any;
  private bookId: string = '';

  constructor(config: YuqueWithPwdConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!this.config.username || !this.config.password || !this.config.login || !this.config.repo) {
      this.ctx.logger.error('缺少语雀配置信息');
    }
    this.config.baseUrl = this.config.baseUrl || 'https://www.yuque.com';
    if (this.config.baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      this.config.baseUrl = this.config.baseUrl.slice(0, -1);
    }
  }
  /**
   * 登陆
   */
  async login() {
    const loginInfo = {
      login: this.config.username,
      password: encrypt(this.config.password),
      loginType: 'password',
    };
    const baseUrl = this.config.baseUrl!;

    const res = await this.ctx.http<any>(
      `${baseUrl}/api/mobile_app/accounts/login?language=zh-cn`,
      {
        method: 'post',
        data: loginInfo,
        headers: {
          Referer: baseUrl + '/login?goto=https%3A%2F%2Fwww.yuque.com%2Fdashboard',
          origin: baseUrl,
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/20G81 YuqueMobileApp/1.0.2 (AppBuild/650 Device/Phone Locale/zh-cn Theme/light YuqueType/public)',
        },
      },
    );
    if (res.status !== 200) {
      this.ctx.logger.error('语雀登陆失败');
    }
    if (res.headers['set-cookie']) {
      // 保存cookie
      this.yuqueCookie = {
        time: Date.now(),
        data: res.headers['set-cookie'] as string,
      };
    }
    this.ctx.logger.success('语雀登陆成功');
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   * @param custom
   */
  private async requestInternal<T>(api: string, reqOpts: any, custom?: boolean): Promise<T> {
    const url = `${this.config.baseUrl}/${api}`;
    const opts: any = {
      headers: {
        cookie: this.yuqueCookie?.data,
      },
      ...reqOpts,
    };
    if (!opts.headers?.cookie) {
      this.ctx.logger.error('未登录语雀!');
    }
    if (custom) {
      const res = await this.ctx.http<T>(url, opts);
      return res.data;
    }
    const res = await this.ctx.http<any>(url, opts);
    if (res.status !== 200) {
      if (res.status === 404 && res.data?.message === 'book not found') {
        this.ctx.logger.info('请参考配置文档：https://elog.1874.cool/notion/write-platform');
        this.ctx.logger.error('知识库不存在，请检查配置');
      } else {
        this.ctx.logger.error(res.data?.message || res);
      }
    }
    return res.data.data;
  }

  /**
   * 获取目录信息（已排序）
   */
  async getToc() {
    const failureMessage = '爬取语雀目录失败，请稍后重试';
    try {
      const res = await this.requestInternal(
        `${this.config.login}/${this.config.repo}`,
        { method: 'get', dataType: 'text' },
        true,
      );
      const dom = new JSDOM(`${res}`, { runScripts: 'dangerously' });
      const { book } = dom?.window?.appData || {};
      dom.window.close();
      if (!book) {
        this.ctx.logger.warn(failureMessage);
        throw new Error(failureMessage);
      }
      this.bookId = book.id;
      return (book?.toc as YuqueCatalog[]) || [];
    } catch (e: any) {
      if (e.message === failureMessage) {
        throw e;
      }
      this.ctx.logger.warn(failureMessage, e.message);
      throw new Error(failureMessage);
    }
  }

  /**
   * 获取文章列表(不带详情)
   */
  async getDocList() {
    return this.requestInternal<YuqueDoc[]>(`api/docs`, {
      method: 'GET',
      data: { book_id: this.bookId },
    });
  }

  /**
   * 获取文章详情
   */
  async getDocString(slug: string) {
    return this.requestInternal<string>(
      `${this.config.login}/${this.config.repo}/${slug}/markdown`,
      {
        method: 'GET',
        data: {
          attachment: true,
          latexcode: !!this.config.latexCode,
          anchor: false,
          linebreak: !!this.config.linebreak,
        },
        dataType: 'text',
      },
      true,
    );
  }
}
