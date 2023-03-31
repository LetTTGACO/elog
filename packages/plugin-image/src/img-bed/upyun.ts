import { getSecretExt } from './utils'
const upyun = require('upyun')
import { out } from '@elog/shared'
import { UPYunConfig } from './types'

/**
 * 又拍云
 */
class UPClient {
  config: UPYunConfig
  imgClient: any
  constructor(config: UPYunConfig) {
    this.config = config
    this.initConfig()
    this.imgClient = new upyun.Client(new upyun.Service(this.config))
  }

  /**
   * 初始化配置
   */
  initConfig() {
    // 判断是否开启拓展点
    if (this.config.secretExt) {
      // 如果开了就从拓展点读取
      this.config = getSecretExt(this.config)
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
      out.warning(`未指定域名host，将使用测试域名：http://${this.config.bucket}.test.upcdn.net`)
      this.config.host = `http://${this.config.bucket}.test.upcdn.net`
    }
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回空
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    try {
      const res = await this.imgClient.headFile(`${this.config.prefixKey}/${fileName}`)
      if (res) {
        return `${this.config.host}/${this.config.prefixKey}/${fileName}`
      } else {
        return undefined
      }
    } catch (e) {
      // out.warn(`上传图片失败，请检查: ${e}`)
      // TODO DEBUG 模式下输出
      return undefined
    }
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param fileName
   */
  async uploadImg(imgBuffer: Buffer, fileName: string): Promise<string | undefined> {
    try {
      const res = await this.imgClient.putFile(`${this.config.prefixKey}/${fileName}`, imgBuffer)
      if (res) {
        return `${this.config.host}/${this.config.prefixKey}/${fileName}`
      } else {
        return undefined
      }
      // out.warn('上传图片失败，请检查又拍云配置')
      // TODO DEBUG 模式下输出
    } catch (e) {
      // out.warn(`上传图片失败，请检查: ${e}`)
      // TODO DEBUG 模式下输出
      return undefined
    }
  }
}

export default UPClient
