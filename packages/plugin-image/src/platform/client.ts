import CosClient from './cos'
import OssClient from './oss'
import UPClient from './upyun'
import GithubClient from './github'
import QiniuClient from './qiniu'
import LocalClient from './local'
import { out } from '@elog/shared'
import { DocDetail } from '@elog/types'
import {
  CosConfig,
  GithubConfig,
  ImageConfig,
  OssConfig,
  QiniuConfig,
  UPYunConfig,
  ImgLocalConfig,
} from './types'
import { imageBedList, ImagePlatformEnum } from './const'

class ImgBedClient {
  config: ImageConfig
  imageClient: any

  constructor(config: ImageConfig) {
    this.config = config
    this.imageClient = this.getImageBedInstance(this.config.platform)
  }

  /**
   * 获取图床对象的实例
   *
   * @param {string} platform 图床类型
   * @return {any} 图床实例
   */
  getImageBedInstance(platform: ImagePlatformEnum) {
    if (!imageBedList.includes(platform)) {
      out.err('配置错误', `目前只支持${imageBedList.toString()}`)
      process.exit(-1)
    }
    switch (platform) {
      case ImagePlatformEnum.COS:
        const cosConfig = this.config.cos as CosConfig
        return new CosClient(cosConfig)
      case ImagePlatformEnum.OSS:
        const ossConfig = this.config.oss as OssConfig
        return new OssClient(ossConfig)
      case ImagePlatformEnum.QINIU:
        const qiniuConfig = this.config.qiniu as QiniuConfig
        return new QiniuClient(qiniuConfig)
      case ImagePlatformEnum.UPYUN:
        const upyunConfig = this.config.upyun as UPYunConfig
        return new UPClient(upyunConfig)
      case ImagePlatformEnum.GITHUB:
        const githubConfig = this.config.github as GithubConfig
        return new GithubClient(githubConfig)
      default:
        const defaultConfig = this.config.local as ImgLocalConfig
        return new LocalClient(defaultConfig)
    }
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    return this.imageClient.hasImage(fileName)
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param fileName
   * @param doc
   */
  async uploadImg(
    imgBuffer: Buffer,
    fileName: string,
    doc: DocDetail,
  ): Promise<string | undefined> {
    return this.imageClient.uploadImg(imgBuffer, fileName, doc)
  }
}

export default ImgBedClient
