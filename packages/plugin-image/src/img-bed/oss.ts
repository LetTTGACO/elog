// 阿里云图床
import OSS from 'ali-oss'
import { OssConfig } from './types'
import { out } from '@elog/shared'
import path from 'path'
import { awaitSync } from '@kaciras/deasync'

class OssClient {
  config: OssConfig
  imgClient: OSS

  constructor(config: OssConfig) {
    this.config = config
    // 账号密码拓展点
    if (this.config.secretExt) {
      out.warning('注意', '正在使用密钥拓展点，请遵循密钥拓展点注入规范')
      try {
        // 如果指定了secret拓展点，那么拓展点返回的账号密码信息，将会覆盖elog-config.json中的image信息
        const secretExtPath = path.resolve(process.cwd(), this.config.secretExt)
        // 拓展点需要暴露getSecret方法
        const { getSecret } = require(secretExtPath)
        const secret = awaitSync(getSecret())
        this.config = { ...this.config, ...secret }
      } catch (e: any) {
        out.err(e.message)
        out.err('执行失败', '密钥拓展点执行失败，请检查！')
      }
    }
    if (this.config.prefixKey?.endsWith('/')) {
      this.config.prefixKey = this.config.prefixKey.slice(0, -1)
    }
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
      endpoint: config.endpoint,
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
    } catch (e: any) {
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
    } catch (e: any) {
      out.warning('跳过上传', `上传图片失败，请检查: ${e.message}`)
      // TODO DEBUG 模式下输出
    }
  }
}

export default OssClient
