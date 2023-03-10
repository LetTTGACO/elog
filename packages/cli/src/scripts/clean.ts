import { out } from '@elog/shared'
import path from 'path'
import { cleanCache, cleanImages, cleanPost } from '../utils/clean'

const clean = async (config = 'elog-config.json', cache = 'elog-cache.json') => {
  try {
    const configPath = path.resolve(process.cwd(), `${config}`)
    const {
      deploy: { postPath },
      image: { enable, bed, output },
    } = require(configPath)
    cleanCache(cache)
    cleanPost(postPath)
    // 清楚本地图片
    if (!enable || bed === 'local') {
      cleanImages(output)
    }
  } catch (error) {
    // @ts-ignore
    out.err('清理失败', error.message)
  }
}

export default clean
