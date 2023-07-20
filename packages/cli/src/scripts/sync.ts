import Elog, { ElogConfig } from '@elog/core'
import path from 'path'
import * as dotenv from 'dotenv'
import { out } from '@elog/shared'
import { getConfig } from '../utils/utils'

/**
 * 同步
 * @param customConfigPath
 * @param customCachePath
 * @param envPath
 * @param isFullCache 缓存所有
 * @param isForced 强制同步
 */
const sync = async (
  customConfigPath?: string,
  customCachePath?: string,
  envPath?: string,
  isFullCache?: boolean,
  isForced?: boolean,
) => {
  // 加载环境变量
  if (envPath) {
    // 本地模式
    envPath = path.resolve(process.cwd(), envPath)
    out.access('环境变量', `已指定读取env文件为：${envPath}`)
    dotenv.config({ override: true, path: envPath })
  } else {
    // 生产模式
    out.access('环境变量', `未指定env文件，将从系统环境变量中读取`)
  }
  // 加载配置文件
  const { config: userConfig, cacheFilePath } = getConfig(customConfigPath, customCachePath)
  const elogConfig = {
    ...userConfig,
    extension: {
      cachePath: cacheFilePath,
      isFullCache: !!isFullCache,
      isForced: !!isForced,
      ...userConfig.extension,
    },
  } as ElogConfig
  const elog = new Elog(elogConfig)
  await elog.deploy()
}

export default sync
