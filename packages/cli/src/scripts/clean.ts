import { out } from '@elog/shared'
import path from 'path'
import { cleanCache, cleanPost, cleanTimestamp } from '../utils/clean'

const clean = async (
  config = 'elog-config.json',
  cache = 'elog-cache.json',
  timestamp = 'elog-timestamp.txt',
) => {
  try {
    const configPath = path.resolve(process.cwd(), `${config}`)
    const { postPath } = require(configPath).deploy
    cleanCache(cache)
    cleanPost(postPath)
    cleanTimestamp(timestamp)
  } catch (error) {
    // @ts-ignore
    out.err('清理失败', error.message)
  }
}

export default clean
