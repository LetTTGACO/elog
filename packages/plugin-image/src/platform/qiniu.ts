// 七牛云图床
import * as qiniu from 'qiniu'
import { QiniuConfig } from './types'
import { out } from '@elog/shared'
import { getSecretExt } from './utils'

class QiNiuClient {
  config: QiniuConfig
  /** 是否初始化结束 */
  isInit?: boolean
  uploadToken?: string
  bucketManager?: qiniu.rs.BucketManager
  formUploader?: qiniu.form_up.FormUploader
  putExtra?: qiniu.form_up.PutExtra

  constructor(config: QiniuConfig) {
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
        secretId: this.config.secretId || process.env.QINIU_SECRET_ID!,
        secretKey: this.config.secretKey || process.env.QINIU_SECRET_KEY!,
      }
    }
    if (!this.config.host) {
      out.err('使用七牛云时，需要指定域名host')
      process.exit(-1)
    }
    const mac = new qiniu.auth.digest.Mac(this.config.secretId, this.config.secretKey)
    const putPolicy = new qiniu.rs.PutPolicy({ scope: this.config.bucket }) // 配置
    this.uploadToken = putPolicy.uploadToken(mac) // 获取上传凭证
    // @ts-ignore
    const qiniuConfig = new qiniu.conf.Config({ zone: this.config.region })
    // 空间对应的机房
    this.formUploader = new qiniu.form_up.FormUploader(qiniuConfig)
    this.bucketManager = new qiniu.rs.BucketManager(mac, qiniuConfig)
    this.putExtra = new qiniu.form_up.PutExtra()
    this.isInit = true
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回空
   *
   * @param {string} fileName 文件名
   * @return {Promise<string>} 图片url
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    if (!this.isInit) {
      await this.init()
    }
    return await new Promise<string | undefined>((resolve) => {
      this.bucketManager?.stat(
        this.config.bucket,
        `${this.config.prefixKey}/${fileName}`,
        (err, _respBody, respInfo) => {
          if (err) {
            out.debug(`检查图片信息时出错: ${err.message}`)
            resolve(undefined)
          } else {
            if (respInfo.statusCode === 200) {
              resolve(`${this.config.host}/${this.config.prefixKey}/${fileName}`)
            } else {
              out.debug('检查图片信息时出错')
              out.debug(JSON.stringify(respInfo))
              resolve(undefined)
            }
          }
        },
      )
    })
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param fileName
   */
  async uploadImg(imgBuffer: Buffer, fileName: string): Promise<string | undefined> {
    if (!this.isInit) {
      await this.init()
    }
    return await new Promise<string | undefined>((resolve) => {
      this.formUploader?.put(
        this.uploadToken!,
        `${this.config.prefixKey}/${fileName}`,
        imgBuffer,
        this.putExtra!,
        (respErr, _respBody, respInfo) => {
          if (respErr) {
            out.debug(`上传图片失败: ${respErr.message}`)
          } else if (respInfo.statusCode === 200) {
            resolve(`${this.config.host}/${this.config.prefixKey}/${fileName}`)
          } else {
            out.debug('上传图片失败')
            out.debug(JSON.stringify(respInfo))
            resolve(undefined)
          }
        },
      )
    })
  }
}

export default QiNiuClient
