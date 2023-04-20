import { out } from '@elog/shared'
import { genConfig } from '../utils/gen-config'

const init = async (name = 'elog.config.js') => {
  genConfig(name)
  out.access('初始化', '🎉初始化成功🎉')
  out.info('下一步', `配置${name || 'elog.config.js'}`)
}

export default init
