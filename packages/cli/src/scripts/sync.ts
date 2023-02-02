import elog from '@elog/core'
import path from 'path'
import * as dotenv from 'dotenv'
import { out } from '@elog/shared'

const sync = async (customConfigName?: string, envPath?: string) => {
  let filename: string
  if (!customConfigName) {
    filename = 'elog-config.json'
  } else {
    const existExt = customConfigName.includes('.')
    if (existExt) {
      filename = customConfigName
    } else {
      filename = customConfigName + '.json'
    }
  }
  const configPath = path.resolve(process.cwd(), `${filename}`)
  const config = require(configPath)
  // 加载环境变量
  if (envPath) {
    // 本地模式
    envPath = path.resolve(process.cwd(), envPath)
    out.info('环境变量', `已指定读取env文件为：${envPath}`)
    dotenv.config({ override: true, path: envPath })
  } else {
    // 生产模式
    out.info('环境变量', `未指定env文件，将从系统环境变量中读取`)
  }
  const ctx = new elog(config)
  await ctx.deploy()
}

export default sync
