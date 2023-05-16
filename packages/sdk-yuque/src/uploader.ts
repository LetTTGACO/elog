import { YuQueResponse, YuqueUploaderConfig } from './types'
import { DocDetail } from '@elog/types'
import { out, request, RequestOptions } from '@elog/shared'

export class YuqueUploader {
  config: YuqueUploaderConfig
  namespace: string

  constructor(config: YuqueUploaderConfig) {
    this.config = config
    this.config.token = config.token || process.env.YUQUE_TOKEN!
    if (!this.config.token) {
      out.err('缺少参数', '缺少语雀Token')
      process.exit(-1)
    }
    this.namespace = `${config.login}/${config.repo}`
  }

  /**
   * send api request to yuque
   * @param api
   * @param reqOpts
   */
  private async request<T>(api: string, reqOpts: RequestOptions): Promise<T> {
    const { token } = this.config
    let baseUrl = this.config.baseUrl || 'https://www.yuque.com/api/v2'
    if (baseUrl.endsWith('/')) {
      // 删除最后一个斜杠
      baseUrl = baseUrl.slice(0, -1)
    }
    const url = `${baseUrl}/${api}`
    const opts: RequestOptions = {
      headers: {
        'X-Auth-Token': token,
      },
      ...reqOpts,
    }
    const res = await request<YuQueResponse<T>>(url, opts)
    if (res.status !== 200) {
      out.warning(JSON.stringify(res))
    }
    return res.data.data
  }

  /**
   * 上传文档列表
   */
  public async uploadDocList(docList: DocDetail[]) {
    console.log(docList)
    // 目标知识库是否存在并且为空
    // 是否存在目录信息
    // 创建目录
    // 上传文档
  }
}
