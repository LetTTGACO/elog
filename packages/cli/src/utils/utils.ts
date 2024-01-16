import fs from 'fs'
import path from 'path'
import { cacheFileNames, configFileNames } from '../const'
import { out } from '@elog/shared'
import { ElogConfig } from '@elog/core'
import * as process from 'process'

export const getPkgJSON = (): any => {
  let pkgJson = { version: '1.0.0' }
  try {
    const pkgJsonPathCjs = path.resolve(__dirname, '../', 'package.json')
    pkgJson = JSON.parse(fs.readFileSync(pkgJsonPathCjs, 'utf8'))
  } catch (e) {
    const pkgJsonPathMjs = path.resolve(__dirname, '../../', 'package.json')
    pkgJson = JSON.parse(fs.readFileSync(pkgJsonPathMjs, 'utf8'))
  }
  return {
    pkgJson,
  }
}

/**
 * 获取配置文件
 * @param customConfigPath
 * @param customCachePath
 */
export const getConfig = (customConfigPath?: string, customCachePath?: string) => {
  const rootPath = process.cwd()
  const configFile =
    customConfigPath || configFileNames.find((name) => fs.existsSync(path.join(rootPath, name)))
  if (!configFile) {
    out.err('错误', '找不到Elog配置文件')
    process.exit(1)
  }
  const cacheFilePath =
    customCachePath ||
    cacheFileNames.find((name) => fs.existsSync(path.join(rootPath, name))) ||
    'elog.cache.json'

  const configFilePath = path.join(rootPath, configFile)

  try {
    const config: Partial<ElogConfig> = require(configFilePath)
    return {
      config,
      configFilePath,
      cacheFilePath,
    }
  } catch (e: any) {
    if (e.message?.includes('Cannot find module')) {
      out.err('错误', `找不到配置文件: ${configFilePath}`)
    } else {
      out.err(e.message)
    }
    process.exit()
  }
}
