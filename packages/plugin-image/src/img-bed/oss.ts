// 阿里云图床
import OSS from 'ali-oss'
import { OssConfig } from './types'

class OssClient {
  config: OssConfig
  imgClient: OSS

  constructor(config: OssConfig) {
    this.config = config
    this.imgClient = new OSS({
      bucket: config.bucket,
      // yourRegion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
      region: config.region,
      // 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户。
      accessKeyId: config.secretId || process.env.OSS_SECRET_ID!,
      accessKeySecret: config.secretKey || process.env.OSS_SECRET_KEY!,
      // 鉴权拓展点支持
      stsToken: config.stsToken,
      secure: config.secure,
    })
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回空
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    try {
      await this.imgClient.head(`${this.config.prefixKey}/${fileName}`)
      if (this.config.host) {
        // TODO 处理host的http完整性
        return `https://${this.config.host}/${this.config.prefixKey}/${fileName}`
      }
      return `https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${this.config.prefixKey}/${fileName}`
    } catch (e) {
      // out.warn(`检查图片信息时出错: ${transformRes(e)}`)
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
      const res = await this.imgClient.put(`${this.config.prefixKey}/${fileName}`, imgBuffer)
      if (this.config.host) {
        // TODO 处理host的http完整性
        return `https://${this.config.host}/${this.config.prefixKey}/${fileName}`
      }
      return res.url
    } catch (e) {
      // out.warn(`上传图片失败，请检查: ${e}`)
      // TODO DEBUG 模式下输出
    }
  }
}

export default OssClient
