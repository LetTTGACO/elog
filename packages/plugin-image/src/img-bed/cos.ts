import COS from 'cos-nodejs-sdk-v5'
import { CosConfig } from './types'

class CosClient {
  config: CosConfig
  imgClient: COS
  constructor(config: CosConfig) {
    this.config = config
    this.imgClient = new COS({
      SecretId: config.secretId || process.env.COS_SECRET_ID, // 身份识别ID
      SecretKey: config.secretKey || process.env.COS_SECRET_KEY, // 身份秘钥
    })
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回undefined
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    try {
      await this.imgClient.headObject({
        Bucket: this.config.bucket, // 存储桶名字（必须）
        Region: this.config.region, // 存储桶所在地域，必须字段
        Key: `${this.config.prefixKey}/${fileName}`, //  文件名  必须
      })
      if (this.config.host) {
        return `https://${this.config.host}/${this.config.prefixKey}/${fileName}`
      }
      return `https://${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${this.config.prefixKey}/${fileName}`
    } catch (e) {
      // TODO DEBUG 模式下输出
    }
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param fileName
   */
  async uploadImg(imgBuffer: Buffer, fileName: string): Promise<string | undefined> {
    try {
      const res = await this.imgClient.putObject({
        Bucket: this.config.bucket, // 存储桶名字（必须）
        Region: this.config.region, // 存储桶所在地域，必须字段
        Key: `${this.config.prefixKey}/${fileName}`, //  文件名  必须
        StorageClass: 'STANDARD', // 上传模式（标准模式）
        Body: imgBuffer, // 上传文件对象
      })
      if (this.config.host) {
        // TODO 处理host的http完整性
        return `https://${this.config.host}/${this.config.prefixKey}/${fileName}`
      }
      return `https://${res.Location}`
    } catch (e) {
      // TODO DEBUG 模式下输出
    }
  }
}

export default CosClient
