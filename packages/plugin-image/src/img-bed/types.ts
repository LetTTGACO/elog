interface ImgBaseConfig {
  bed: ImgBedEnum
  host?: string
  prefixKey?: string
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

export interface LocalConfig extends ImgBaseConfig {
  output: string
}

export enum ImgBedEnum {
  QINIU = 'qiniu',
  UPYUN = 'upyun',
  COS = 'cos',
  GITHUB = 'github',
  OSS = 'oss',
  LOCAL = 'local',
}

export type ImgConfig =
  | CosConfig
  | OssConfig
  | QiniuConfig
  | UPYunConfig
  | GithubConfig
  | LocalConfig
