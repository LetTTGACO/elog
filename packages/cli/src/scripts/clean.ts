import { out } from '@elog/shared'
import { cleanCache, cleanImages, cleanPost } from '../utils/clean'
import { getConfig } from '../utils/utils'

const clean = async (customConfigPath: string, customCachePath: string) => {
  try {
    // 加载配置文件
    const { config, cacheFilePath } = getConfig(customConfigPath, customCachePath)
    const {
      deploy: { local: { outputDir: docOutputDir } } = {},
      image: { enable, platform, local: { outputDir: imageOutputDir } } = {},
    } = config
    cleanCache(cacheFilePath)
    cleanPost(docOutputDir)
    // 清楚本地图片
    if (enable && platform === 'local' && imageOutputDir) {
      cleanImages(imageOutputDir)
    }
  } catch (error: any) {
    out.err(`清理失败, ${error.message}`)
  }
}

export default clean
