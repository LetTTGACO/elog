import axios, { Method } from 'axios'
import { GithubConfig } from './types'
import mime from 'mime-types'
import { out } from '@elog/shared'

// Github图床
class GithubClient {
  config: GithubConfig

  constructor(config: GithubConfig) {
    this.config = config
    this.init()
  }

  init() {
    if (!this.config.host) {
      // out.warn('未指定加速域名，将使用默认域名：https://raw.githubusercontent.com')
    } else if (this.config.host?.includes('cdn.jsdelivr.net')) {
      // 如果指定了加速域名
      this.config.host = 'https://cdn.jsdelivr.net'
      // out.info(`图床域名：${this.config.host}`)
    }
  }

  async _fetch(method: Method, fileName: string, base64File?: string): Promise<string | undefined> {
    const path = `https://api.github.com/repos/${this.config.user}/${this.config.repo}/contents/${this.config.prefixKey}/${fileName}`
    const data = base64File && {
      message: 'Upload by elog',
      branch: this.config.branch,
      content: base64File,
    }
    const token = this.config.token || process.env.GITHUB_TOKEN
    try {
      const result = await axios.request({
        method,
        url: path,
        data,
        timeout: 60000,
        headers: {
          'Content-Type': mime.lookup(fileName),
          'User-Agent': '@elog/plugin-image',
          Authorization: `token ${token}`,
        },
      })
      if (result.status === 409) {
        out.warning('图片上传失败', '由于github并发问题，图片上传失败')
      } else if (result.status === 200 || result.status === 201) {
        if (this.config.host) {
          return `${this.config.host}/gh/${this.config.user}/${this.config.repo}/${this.config.prefixKey}/${fileName}`
        } else if (method === 'GET') {
          return result.data.download_url as string
        } else {
          return result.data.content.download_url as string
        }
      }
    } catch (e) {
      if (base64File) {
        // @ts-ignore
        out.warning('请求失败', e.message)
      } else {
        // @ts-ignore
        out.warning('NOT FOUND', e.message)
      }
    }
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回空
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    return await this._fetch('GET', fileName)
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param fileName
   */
  async uploadImg(imgBuffer: Buffer, fileName: string): Promise<string | undefined> {
    const base64File = imgBuffer.toString('base64')
    return await this._fetch('PUT', fileName, base64File)
  }
}

export default GithubClient
