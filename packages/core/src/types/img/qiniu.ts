export interface QiniuConfig {
  enable?: boolean
  secretId: string
  secretKey: string
  bucket: string
  region: string
  prefixKey?: string
  host: string
}
