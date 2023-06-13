import latestVersion from 'latest-version'
import inquirer from 'inquirer'
import { gt } from 'semver'
import { out } from '@elog/shared'
import { runCmdSync } from '../utils/run'

const enum PackageManager {
  NPM = 'npm',
  PNPM = 'pnpm',
  YARN = 'yarn',
}

const upgrade = async ({ version, name }: { version: string; name: string }) => {
  const newVersion = await latestVersion(name)
  const currentVersion = version
  out.access('当前版本', currentVersion)
  out.access('最新版本', newVersion)
  if (gt(newVersion, currentVersion)) {
    inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: '是否更新',
          default: true,
        },
      ])
      .then((answers) => {
        const confirmed = answers.confirmed
        if (!confirmed) {
          out.access('取消更新')
          process.exit(0)
        } else {
          inquirer
            .prompt([
              {
                type: 'list',
                name: 'cli',
                message: '请选择包管理器',
                default: 'npm',
                choices: [
                  {
                    name: PackageManager.NPM,
                    value: PackageManager.NPM,
                  },
                  {
                    name: PackageManager.PNPM,
                    value: PackageManager.PNPM,
                  },
                  {
                    name: PackageManager.YARN,
                    value: PackageManager.YARN,
                  },
                ],
              },
            ])
            .then((answers) => {
              const { cli } = answers
              if (cli === PackageManager.YARN) {
                runCmdSync(`yarn global add ${name}@${newVersion}`)
              } else {
                runCmdSync(`${cli} install ${name}@${newVersion} -g`)
              }
            })
        }
      })
  } else {
    out.access('提示', `当前已是最新版本: ${currentVersion}`)
    process.exit(0)
  }
}

export default upgrade
