// 阿里云图床
import OSS from 'ali-oss'
import { OssConfig } from './types'
import { out } from '@elog/shared'
import { getSecretExt } from './utils'

class OssClient {
  config: OssConfig
  imgClient?: OSS

  constructor(config: OssConfig) {
    this.config = config
    // 尝试初始化OSS实例
    void this.init()
  }

  /**
   * 初始化配置和OSS实例
   */
  async init() {
    // 处理prefixKey配置
    if (this.config.prefixKey?.endsWith('/')) {
      this.config.prefixKey = this.config.prefixKey.slice(0, -1)
    }
    // 判断是否开启拓展点
    if (this.config.secretExt) {
      // 如果开了就从拓展点读取
      this.config = await getSecretExt(this.config)
    } else {
      // 如果没开拓展点，就从配置文件/环境变量中读取
      this.config = {
        ...this.config,
        accessKeyId: this.config.secretId || process.env.OSS_SECRET_ID!,
        accessKeySecret: this.config.secretKey || process.env.OSS_SECRET_KEY!,
      }
    }
    this.config.prefixKey = this.config.prefixKey || '/'
    this.imgClient = new OSS(this.config)
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回空
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    if (!this.imgClient) {
      await this.init()
    }
    try {
      await this.imgClient!.head(`${this.config.prefixKey}${fileName}`)
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}${fileName}`
      }
      return `https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${this.config.prefixKey}${fileName}`
    } catch (e: any) {
      out.debug(`图床检查出错: ${e.message}`)
    }
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param fileName
   */
  async uploadImg(imgBuffer: Buffer, fileName: string): Promise<string | undefined> {
    if (!this.imgClient) {
      await this.init()
    }
    try {
      const res = await this.imgClient!.put(`${this.config.prefixKey}${fileName}`, imgBuffer)
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}${fileName}`
      }
      return res!.url
    } catch (e: any) {
      out.warning('跳过上传', `上传图片失败，请检查: ${e.message}`)
      out.debug(e)
    }
  }
}

export default OssClient
