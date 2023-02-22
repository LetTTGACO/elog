import * as fs from 'fs'
import { imgTemplate, platformTemplate } from '../template'

/**
 * 生成配置文件
 * @param platform
 * @param name
 */
export const genConfig = (platform: any, name: string) => {
  const platformName = `${platform.writing}-${platform.deploy}`
  const imgName = platform.imgCdn
  const platformConfig = platformTemplate[platformName]
  const imgConfig = imgTemplate[imgName]
  const config = { ...platformConfig, ...imgConfig }
  fs.writeFileSync(`${process.cwd()}/${name}`, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
  })
}
