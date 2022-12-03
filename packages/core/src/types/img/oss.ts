export interface OssConfig {
  enable?: boolean
  secretId: string
  secretKey: string
  bucket: string
  region: string
  host?: string
  prefixKey?: string
}
