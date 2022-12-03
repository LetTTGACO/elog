import { CosConfig } from './cos'
import { OssConfig } from './oss'
import { GithubConfig } from './github'
import { QiniuConfig } from './qiniu'
import { UPConfig } from './upyun'

export type ImgConfig = CosConfig | OssConfig | GithubConfig | QiniuConfig | UPConfig
