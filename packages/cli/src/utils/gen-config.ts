import * as path from 'path'
import * as fs from 'fs'
/**
 * 生成配置文件
 * @param platform
 * @param name
 */
export const genConfig = (platform: any, name: string) => {
  const filename = `${platform.writing}-${platform.deploy}`
  const configPath = path.join(__dirname, `./template/platform/${filename}.json`)
  const platformConfig = require(configPath)
  const imgName = `${platform.imgCdn}.json`
  const imgPath = path.join(__dirname, `./template/img/${imgName}`)
  const ImgConfig = require(imgPath)
  const config = { ...platformConfig, ...ImgConfig }
  const configName = name || 'elog-config'
  fs.writeFileSync(`${process.cwd()}/${configName}.json`, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
  })
}
