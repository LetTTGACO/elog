import { ImagePlatformEnum } from './const'
import { COSOptions } from 'cos-nodejs-sdk-v5'
import { Options as OSSOptions } from 'ali-oss'
import { DocDetail } from '@elog/types'

interface ImgBaseConfig {
  host?: string
  prefixKey?: string
  secretExt?: string
}

export interface ICosConfig extends ImgBaseConfig {
  secretId: string
  secretKey: string
  bucket: string
  region: string
}

export type CosConfig = ICosConfig & COSOptions

export interface IOssConfig extends ImgBaseConfig {
  secretId: string
  secretKey: string
  bucket: string
  region: string
  stsToken?: string
  secure?: boolean
  endpoint?: string
}
export type OssConfig = IOssConfig & OSSOptions

export interface QiniuConfig extends ImgBaseConfig {
  secretId: string
  secretKey: string
  bucket: string
  region: string
}

export interface UPYunConfig extends ImgBaseConfig {
  bucket: string
  user: string
  password: string
}

export type GetImagePath = (
  doc: DocDetail,
  outputDir: string,
) => { dirPath: string; prefixKey: string }

export interface GithubConfig extends ImgBaseConfig {
  user: string
  token: string
  repo: string
  branch?: string
}

export interface ImgLocalConfig {
  outputDir: string
  prefixKey?: string
  /** 路径根据文档计算 */
  pathFollowDoc?: boolean
  /** 图片路径拓展点 */
  imagePathExt?: string
}

export type ImagePlugin = string | Function

/**
 * 图床配置
 */
type ImagePlatformConfig = { [key in ImagePlatformEnum]: any }
export type ImageConfig = {
  enable: boolean
  /** 是否禁用替换 Html 标签的图片 */
  disableHtmlImg?: boolean
  platform: ImagePlatformEnum | string
  /** 不开启图床使用图床插件 */
  enableForExt?: string
  plugin?: ImagePlugin
  [key: string]: any
} & ImagePlatformConfig
