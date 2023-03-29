import { out } from '@elog/shared'
import inquirer from 'inquirer'
import { genConfig } from '../utils/gen-config'

const init = async (name: string) => {
  inquirer
    .prompt([
      {
        type: 'list',
        name: 'write',
        message: '请选择写作平台',
        choices: [
          {
            name: '语雀',
            value: 'yuque',
          },
          {
            name: 'Notion',
            value: 'notion',
          },
        ],
      },
      {
        type: 'list',
        name: 'deploy',
        message: '请选择部署平台',
        default: 'local',
        choices: [
          {
            name: '本地(适用于Hexo/HuGo/Vitepress等)',
            value: 'local',
          },
          {
            name: 'Confluence',
            value: 'confluence',
          },
        ],
      },
      {
        type: 'list',
        name: 'image',
        message: '请选择图床',
        default: '',
        choices: [
          {
            name: '暂不',
            value: '',
          },
          {
            name: '本地',
            value: 'local',
          },
          {
            name: '腾讯云图床',
            value: 'cos',
          },
          {
            name: '阿里云图床',
            value: 'oss',
          },
          {
            name: 'Github图床',
            value: 'github',
          },
          {
            name: '七牛云图床',
            value: 'qiniu',
          },
          {
            name: '又拍云图床',
            value: 'upyun',
          },
        ],
      },
    ])
    .then(async (answers) => {
      let configName = name || 'elog.config'
      if (!configName.endsWith('.json')) {
        configName = configName + '.json'
      }
      genConfig(answers, configName)
      out.access('初始化', '🎉初始化成功🎉')
      out.info('下一步', `配置${configName || 'elog.config.json'}`)
    })
    .catch((error) => {
      if (error.isTtyError) {
        // 当前运行环境不支持
        out.err(
          '初始化失败',
          `Prompt couldn't be rendered in the current environment, please check your platform`,
        )
      } else {
        out.err('初始化失败', error.message)
        process.exit(1)
      }
    })
}

export default init
