import elog from '@elog/core'
import path from 'path'
import * as dotenv from 'dotenv'

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
  envPath = path.resolve(process.cwd(), envPath || '.env')
  dotenv.config({ override: true, path: envPath })
  const ctx = new elog(config)
  await ctx.deploy()
}

export default sync
