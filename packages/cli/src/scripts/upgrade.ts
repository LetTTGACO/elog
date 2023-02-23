import latestVersion from 'latest-version'
import inquirer from 'inquirer'
import { gt } from 'semver'
import { out } from '@elog/shared'
import { runCmdSync } from '../utils/run'
import { getPkgJSON } from '../utils/utils'
const { pkgJson } = getPkgJSON()

const enum PackageManager {
  NPM = 'npm',
  PNPM = 'pnpm',
  YARN = 'yarn',
}

const upgrade = async () => {
  const newVersion = await latestVersion(pkgJson.name)
  const currentVersion = pkgJson.version
  out.info('当前版本', currentVersion)
  out.info('最新版本', newVersion)
  if (gt(newVersion, currentVersion)) {
    inquirer
      .prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: '是否更新',
          default: true,
        },
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
        const { confirmed, cli } = answers
        if (confirmed) {
          if (cli === PackageManager.YARN) {
            runCmdSync(`yarn global add ${pkgJson.name}@${newVersion}`)
          } else {
            runCmdSync(`${cli} install ${pkgJson.name}@${newVersion} -g`)
          }
        } else {
          out.info('取消更新')
          process.exit(0)
        }
      })
  } else {
    out.info('提示', `当前已是最新版本: ${currentVersion}`)
    process.exit(0)
  }
}

export default upgrade
