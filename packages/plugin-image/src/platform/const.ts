export enum ImagePlatformEnum {
  QINIU = 'qiniu',
  UPYUN = 'upyun',
  COS = 'cos',
  GITHUB = 'github',
  OSS = 'oss',
  LOCAL = 'local',
}

export const imageBedList = Object.values(ImagePlatformEnum)
