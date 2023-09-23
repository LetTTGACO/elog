import { GithubConfig } from './types'
import { out, request, RequestOptions } from '@elog/shared'
import { formattedPrefix, getSecretExt } from './utils'

// Github图床
class GithubClient {
  config: GithubConfig
  /** 是否初始化结束 */
  isInit?: boolean

  constructor(config: GithubConfig) {
    this.config = config
    // 尝试初始化Github配置
    void this.init()
  }

  async init() {
    if (!this.config.host) {
      out.access('未指定加速域名，将使用默认域名：https://raw.githubusercontent.com')
    } else if (this.config.host?.includes('cdn.jsdelivr.net')) {
      // 如果指定了加速域名
      this.config.host = 'https://cdn.jsdelivr.net'
    }
    // 判断是否开启拓展点
    if (this.config.secretExt) {
      // 如果开了就从拓展点读取
      this.config = await getSecretExt(this.config)
    } else {
      // 如果没开拓展点，就从配置文件/环境变量中读取
      this.config = {
        ...this.config,
        token: this.config.token || process.env.GITHUB_TOKEN!,
      }
    }
    if (!this.config.token || !this.config.user || !this.config.repo) {
      out.err('缺少Github 配置信息')
      process.exit(-1)
    }
    // 处理prefixKey
    this.config.prefixKey = formattedPrefix(this.config.prefixKey)
    this.isInit = true
  }

  async _fetch(
    fileName: string,
    options: RequestOptions,
    base64File?: string,
  ): Promise<string | undefined> {
    if (!this.isInit) {
      await this.init()
    }
    const path = `https://api.github.com/repos/${this.config.user}/${this.config.repo}/contents/${this.config.prefixKey}${fileName}`
    const data = base64File && {
      message: 'Upload by elog',
      branch: this.config.branch || 'master',
      content: base64File,
    }
    const method = options.method
    try {
      const result = await request<any>(path, {
        data,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
        method,
      })
      if (result.status === 409) {
        out.warning('图片上传失败', '由于github并发问题，图片上传失败')
      } else if (result.status === 200 || result.status === 201) {
        if (this.config.host) {
          return `${this.config.host}/gh/${this.config.user}/${this.config.repo}/${this.config.prefixKey}${fileName}`
        } else if (method === 'GET') {
          return result.data.download_url as string
        } else {
          return result.data.content.download_url as string
        }
      }
    } catch (e: any) {
      if (base64File) {
        out.warning('请求失败', e.message)
        out.debug(e)
      } else {
        out.warning('NOT FOUND', e.message)
        out.debug(e)
      }
    }
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回空
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    return await this._fetch(fileName, { method: 'GET' })
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param fileName
   */
  async uploadImg(imgBuffer: Buffer, fileName: string): Promise<string | undefined> {
    const base64File = imgBuffer.toString('base64')
    return await this._fetch(fileName, { method: 'PUT' }, base64File)
  }
}

export default GithubClient
