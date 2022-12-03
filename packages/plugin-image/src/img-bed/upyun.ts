const upyun = require('upyun')
import { UPYunConfig } from './types'
class UPClient {
  config: UPYunConfig
  imgClient: any
  constructor(config: UPYunConfig) {
    this.config = config
    if (!this.config.host) {
      // out.warn(`未指定域名host，将使用测试域名：http://${this.config.bucket}.test.upcdn.net`);
      this.config.host = `http://${this.config.bucket}.test.upcdn.net`
    }
    // 如果不指定协议，默认使用http
    // TODO 检查URL完整性
    if (!this.config.host.startsWith('http')) {
      this.config.host = `http://${this.config.bucket}`
      // out.info(`图床域名：${this.config.host}`);
    }
    const user = this.config.user || process.env.UPYUN_SECRET_ID
    const password = this.config.password || process.env.UPYUN_SECRET_KEY
    this.imgClient = new upyun.Client(new upyun.Service(this.config.bucket, user, password))
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
