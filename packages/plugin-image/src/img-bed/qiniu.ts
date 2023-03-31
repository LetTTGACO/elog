// 七牛云图床
import * as qiniu from 'qiniu'
import { QiniuConfig } from './types'
import { out } from '@elog/shared'
import { getSecretExt } from './utils'

class QiNiuClient {
  config: QiniuConfig
  uploadToken: string
  bucketManager: qiniu.rs.BucketManager
  formUploader: qiniu.form_up.FormUploader
  putExtra: qiniu.form_up.PutExtra

  constructor(config: QiniuConfig) {
    this.config = config
    this.initConfig()
    const mac = new qiniu.auth.digest.Mac(this.config.secretId, this.config.secretKey)
    const putPolicy = new qiniu.rs.PutPolicy({ scope: this.config.bucket }) // 配置
    this.uploadToken = putPolicy.uploadToken(mac) // 获取上传凭证
    // @ts-ignore
    const qiniuConfig = new qiniu.conf.Config({ zone: this.config.region })
    // 空间对应的机房
    this.formUploader = new qiniu.form_up.FormUploader(qiniuConfig)
    this.bucketManager = new qiniu.rs.BucketManager(mac, qiniuConfig)
    this.putExtra = new qiniu.form_up.PutExtra()
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
        secretId: this.config.secretId || process.env.QINIU_SECRET_ID!,
        secretKey: this.config.secretKey || process.env.QINIU_SECRET_KEY!,
      }
    }
    if (!this.config.host) {
      out.err('使用七牛云时，需要指定域名host')
      process.exit(-1)
    }
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url,不存在返回空
   *
   * @param {string} fileName 文件名
   * @return {Promise<string>} 图片url
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    return await new Promise<string | undefined>((resolve) => {
      this.bucketManager?.stat(
        this.config.bucket,
        `${this.config.prefixKey}/${fileName}`,
        (err, _respBody, respInfo) => {
          if (err) {
            // out.warn(`检查图片信息时出错: ${transformRes(err)}`)
            resolve(undefined)
          } else {
            if (respInfo.statusCode === 200) {
              resolve(`${this.config.host}/${this.config.prefixKey}/${fileName}`)
            } else {
              // TODO DEBUG 模式下输出
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
    return await new Promise<string | undefined>((resolve) => {
      this.formUploader?.put(
        this.uploadToken,
        `${this.config.prefixKey}/${fileName}`,
        imgBuffer,
        this.putExtra,
        (respErr, _respBody, respInfo) => {
          if (respErr) {
            // out.warn(`上传图片失败，请检查: ${transformRes(respErr)}`)
            resolve(undefined)
          } else if (respInfo.statusCode === 200) {
            resolve(`${this.config.host}/${this.config.prefixKey}/${fileName}`)
          } else {
            // TODO DEBUG 模式下输出
            // out.warn(`上传图片失败，请检查: ${transformRes(respInfo)}`)
            resolve(undefined)
          }
        },
      )
    })
  }
}

export default QiNiuClient
