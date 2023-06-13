import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
import { getSecretExt } from './utils'
const upyun = require('upyun')
import { out } from '@elog/shared'
import { UPYunConfig } from './types'

/**
 * 又拍云
 */
class UPClient {
  config: UPYunConfig
  imgClient?: any
  constructor(config: UPYunConfig) {
    this.config = config
    // 尝试初始化实例
    void this.init()
  }

  /**
   * 初始化配置
   */
  async init() {
    // 判断是否开启拓展点
    if (this.config.secretExt) {
      // 如果开了就从拓展点读取
      this.config = await getSecretExt(this.config)
    } else {
      // 如果没开拓展点，就从配置文件/环境变量中读取
      this.config = {
        ...this.config,
        user: this.config.user || process.env.UPYUN_SECRET_ID!,
        password: this.config.password || process.env.UPYUN_SECRET_KEY!,
      }
    }
    // 域名
    if (!this.config.host) {
      out.access(`未指定域名host，将使用测试域名：http://${this.config.bucket}.test.upcdn.net`)
      this.config.host = `http://${this.config.bucket}.test.upcdn.net`
    }
    this.imgClient = new upyun.Client(new upyun.Service(this.config))
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
      const res = await this.imgClient.headFile(`${this.config.prefixKey}/${fileName}`)
      if (res) {
        return `${this.config.host}/${this.config.prefixKey}/${fileName}`
      } else {
        return undefined
      }
    } catch (e: any) {
      out.debug(`上传图片失败，请检查: ${e.message}`)
      return undefined
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
      const res = await this.imgClient.putFile(`${this.config.prefixKey}/${fileName}`, imgBuffer)
      if (res) {
        return `${this.config.host}/${this.config.prefixKey}/${fileName}`
      } else {
        return undefined
      }
    } catch (e: any) {
      out.debug(`上传图片失败，请检查: ${e.message}`)
      return undefined
    }
  }
}

export default UPClient
