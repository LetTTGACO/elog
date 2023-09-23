import COS from 'cos-nodejs-sdk-v5'
import { CosConfig } from './types'
import { out } from '@elog/shared'
import { formattedPrefix, getSecretExt } from './utils'

/**
 * 腾讯云COS
 */
class CosClient {
  config: CosConfig
  imgClient?: COS
  constructor(config: CosConfig) {
    this.config = config
    // 尝试初始化COS实例
    void this.initCos()
  }

  /**
   * 初始化配置和COS实例
   */
  async initCos() {
    // 判断是否开启拓展点
    if (this.config.secretExt) {
      // 如果开了就从拓展点读取
      this.config = await getSecretExt(this.config)
    } else {
      // 如果没开拓展点，就从配置文件/环境变量中读取
      this.config = {
        ...this.config,
        secretId: this.config.secretId || process.env.COS_SECRET_ID!,
        secretKey: this.config.secretKey || process.env.COS_SECRET_KEY!,
      }
    }
    if (!this.config.secretId || !this.config.secretKey) {
      out.err('缺少腾讯云COS密钥信息')
      process.exit(-1)
    }
    // 处理prefixKey
    this.config.prefixKey = formattedPrefix(this.config.prefixKey)
    this.imgClient = new COS(this.config)
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回undefined
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    if (!this.imgClient) {
      await this.initCos()
    }
    try {
      await this.imgClient!.headObject({
        Bucket: this.config.bucket, // 存储桶名字（必须）
        Region: this.config.region, // 存储桶所在地域，必须字段
        Key: `${this.config.prefixKey}${fileName}`, //  文件名  必须
      })
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}${fileName}`
      }
      return `https://${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${this.config.prefixKey}${fileName}`
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
      await this.initCos()
    }
    try {
      const res = await this.imgClient!.putObject({
        Bucket: this.config.bucket, // 存储桶名字（必须）
        Region: this.config.region, // 存储桶所在地域，必须字段
        Key: `${this.config.prefixKey}/${fileName}`, //  文件名  必须
        StorageClass: 'STANDARD', // 上传模式（标准模式）
        Body: imgBuffer, // 上传文件对象
      })
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}${fileName}`
      }
      return `https://${res.Location}`
    } catch (e: any) {
      out.warning('跳过上传', `上传图片失败，请检查: ${e.message}`)
      out.debug(e)
    }
  }
}

export default CosClient
