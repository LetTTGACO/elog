import type {
  YuqueCatalog,
  YuqueDoc,
  YuqueDocDetail,
  YuqueDocListResponse,
  YuqueWithTokenConfig,
} from './types';
import { ElogBaseContext, PluginContext } from '@elogx-test/elog';

export default class YuqueApi extends ElogBaseContext {
  private readonly config: YuqueWithTokenConfig;
  constructor(config: YuqueWithTokenConfig, ctx: PluginContext) {
    super(ctx);
    this.config = config;
    if (!this.config.token || !this.config.repo || !this.config.login) {
      this.ctx.info('请查阅Elog配置文档: https://elog.1874.cool/notion/write-platform');
      this.ctx.error('缺少语雀配置信息');
    }
    this.config.baseUrl = this.config.baseUrl || 'https://www.yuque.com';
    if (this.config.baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      this.config.baseUrl = this.config.baseUrl.slice(0, -1);
    }
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   * @param custom
   */
  private async requestInternal<T>(api: string, reqOpts: any, custom?: boolean): Promise<T> {
    const { token } = this.config;
    let baseUrl = this.config.baseUrl + '/api/v2';
    const url = `${baseUrl}/${api}`;
    const opts: any = {
      headers: {
        'X-Auth-Token': token,
      },
      ...reqOpts,
    };
    if (custom) {
      const res = await this.ctx.request<T>(url, opts);
      return res.data;
    }
    const res = await this.ctx.request<any>(url, opts);
    if (res.status !== 200) {
      if (res.status === 404 && res.data?.message === 'book not found') {
        this.ctx.info('请参考配置文档：https://elog.1874.cool/notion/write-platform');
        this.ctx.error('知识库不存在，请检查配置');
      } else {
        this.ctx.error(res.data?.message || res);
      }
    }
    return res.data.data;
  }

  /**
   * 获取目录
   */
  async getToc() {
    return this.requestInternal<YuqueCatalog[]>(
      `repos/${this.config.login}/${this.config.repo}/toc`,
      {
        method: 'GET',
      },
    );
  }

  /**
   * 获取文章列表(不带详情)
   */
  async getDocList() {
    // 获取目录信息
    const list: YuqueDoc[] = [];
    const self = this;
    const getList = async (offset = 0) => {
      const pageSize = 100; // 设置分页大小为100
      const res = await self.requestInternal<YuqueDocListResponse>(
        `repos/${this.config.login}/${this.config.repo}/docs`,
        {
          method: 'GET',
          data: { offset, limit: pageSize },
        },
        true,
      );
      list.push(...res.data);
      if (res.meta.total > offset + pageSize) {
        await getList(offset + pageSize);
      }
    };
    await getList();
    return list;
  }

  /**
   * 获取文章详情
   */
  async getDocDetail(slug: string) {
    return this.requestInternal<YuqueDocDetail>(
      `repos/${this.config.login}/${this.config.repo}/docs/${slug}`,
      {
        method: 'GET',
        data: { raw: 1 },
      },
    );
  }
}
