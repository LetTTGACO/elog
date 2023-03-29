import CosClient from './cos'
import OssClient from './oss'
import UPClient from './upyun'
import GithubClient from './github'
import QiniuClient from './qiniu'
import LocalClient from './local'
import { out } from '@elog/shared'
import {
  CosConfig,
  GithubConfig,
  ImageConfig,
  OssConfig,
  QiniuConfig,
  UPYunConfig,
  LocalConfig,
} from './types'
import { imageBedList, ImagePlatformEnum } from './const'

class ImgBedClient {
  config: ImageConfig
  imageClient: any

  constructor(config: ImageConfig) {
    this.config = config
    this.imageClient = this.getImageBedInstance(this.config.bed)
  }

  /**
   * 获取图床对象的实例
   *
   * @param {string} imageBed 图床类型
   * @return {any} 图床实例
   */
  getImageBedInstance(imageBed: ImagePlatformEnum) {
    if (!imageBedList.includes(imageBed)) {
      out.err('配置错误', `目前只支持${imageBedList.toString()}`)
      process.exit(-1)
    }
    if (imageBed === ImagePlatformEnum.COS) {
      const config = this.config.cos as CosConfig
      return new CosClient(config)
    } else if (imageBed === ImagePlatformEnum.OSS) {
      const config = this.config.oss as OssConfig
      return new OssClient(config)
    } else if (imageBed === ImagePlatformEnum.QINIU) {
      const config = this.config.qiniu as QiniuConfig
      return new QiniuClient(config)
    } else if (imageBed === ImagePlatformEnum.UPYUN) {
      const config = this.config.upyun as UPYunConfig
      return new UPClient(config)
    } else if (imageBed === ImagePlatformEnum.GITHUB) {
      const config = this.config.github as GithubConfig
      return new GithubClient(config)
    } else if (imageBed === ImagePlatformEnum.LOCAL) {
      const config = this.config.local as LocalConfig
      return new LocalClient(config)
    } else {
      const config = this.config.local as LocalConfig
      return new LocalClient(config)
    }
  }

  /**
   * 检查图床是否已经存在图片，存在则返回url
   * @param fileName
   */
  async hasImage(fileName: string): Promise<string | undefined> {
    return await this.imageClient.hasImage(fileName)
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param fileName
   */
  async uploadImg(imgBuffer: Buffer, fileName: string): Promise<string | undefined> {
    return await this.imageClient.uploadImg(imgBuffer, fileName)
  }
}

export default ImgBedClient
