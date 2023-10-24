import { out } from '@elog/shared'
import { genConfigFile } from '../utils/gen-config-file'
import { genEnvFile } from '../utils/gen-env-file'

const init = async (configName = 'elog.config.js', envName = '.elog.env') => {
  genConfigFile(configName)
  genEnvFile(envName)
  out.access('初始化', ' 初始化成功 ')
  out.warning('注意！', `请将${envName} 文件加入.gitignore，防止密码等信息误提交`)
  out.info('下一步', `配置${configName}和${envName}`)
  out.info('请查阅Elog配置文档: https://elog.1874.cool/notion/config-catalog')
}

export default init
