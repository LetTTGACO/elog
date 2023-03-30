import { ImagePlatformEnum } from './const'
import { COSOptions } from 'cos-nodejs-sdk-v5'
import { Options as OSSOptions } from 'ali-oss'

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

export interface GithubConfig extends ImgBaseConfig {
  user: string
  token: string
  repo: string
  branch?: string
}

export interface LocalConfig {
  outputDir: string
  prefixKey: string
}

/**
 * 图床配置
 */
type ImagePlatformConfig = { [key in ImagePlatformEnum]: any }
export type ImageConfig = {
  enable: boolean
  bed: ImagePlatformEnum
} & ImagePlatformConfig
