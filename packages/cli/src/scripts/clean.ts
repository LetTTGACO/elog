import { out } from '@elog/shared'
import { cleanCache, cleanImages, cleanPost } from '../utils/clean'
import { getConfig } from '../utils/utils'

const clean = async (customConfigPath: string, customCachePath: string) => {
  try {
    // 加载配置文件
    const { config, cacheFilePath } = getConfig(customConfigPath, customCachePath)
    const {
      deploy: { platform: deployPlatform, local: { outputDir: docOutputDir } = {} as any } = {},
      image: {
        enable,
        platform: imagePlatform,
        local: { outputDir: imageOutputDir } = {} as any,
      } = {},
    } = config

    cleanCache(cacheFilePath)
    if (deployPlatform === 'local' && docOutputDir) {
      cleanPost(docOutputDir, cacheFilePath)
    }
    // 清楚本地图片
    if (enable && imagePlatform === 'local' && imageOutputDir) {
      cleanImages(imageOutputDir)
    }
  } catch (error: any) {
    out.err(`清理失败, ${error.message}`)
  }
}

export default clean
