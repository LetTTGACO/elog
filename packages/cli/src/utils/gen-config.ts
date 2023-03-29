import * as fs from 'fs'
import { imageTemplate, platformTemplate } from '../template'

/**
 * 生成配置文件
 * @param platform
 * @param configName
 */
export const genConfig = (platform: any, configName: string) => {
  const platformName = `${platform.write}-${platform.deploy}`
  const imgName = platform.image
  const platformConfig = platformTemplate[platformName]
  const imgConfig = imageTemplate[imgName]
  const config = { ...platformConfig, ...imgConfig }
  fs.writeFileSync(`${process.cwd()}/${configName}`, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
  })
}
