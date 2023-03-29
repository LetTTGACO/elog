import { DeployPlatformEnum, FileNameEnum, FormatEnum } from './const'

/**
 * local 配置
 */
export interface LocalConfig {
  outputDir: string
  filename: FileNameEnum
  format: FormatEnum
  catalog: boolean
}

/**
 * 部署配置
 */
type DeployPlatformConfig = { [key in DeployPlatformEnum]: any }
export type DeployConfig = {
  platform: DeployPlatformEnum
} & DeployPlatformConfig
