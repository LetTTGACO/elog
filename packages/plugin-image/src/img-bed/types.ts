import { ImagePlatformEnum } from './const'

interface ImgBaseConfig {
  host?: string
  prefixKey?: string
  secretExt?: string
}

export interface CosConfig extends ImgBaseConfig {
  secretId: string
  secretKey: string
  bucket: string
  region: string
}

export interface OssConfig extends ImgBaseConfig {
  secretId: string
  secretKey: string
  bucket: string
  region: string
  stsToken?: string
  secure?: boolean
  endpoint?: string
}

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
