import { out } from '@elog/shared'
import { genConfigFile } from '../utils/gen-config-file'
import { genEnvFile } from '../utils/gen-env-file'

const init = async (configName = 'elog.config.js', envName = '.elog.env') => {
  genConfigFile(configName)
  genEnvFile(envName)
  out.access('初始化', '🎉 初始化成功 🎉')
  out.info('下一步', `配置${configName}和${envName}`)
}

export default init
