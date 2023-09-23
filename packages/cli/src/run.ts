import { program } from 'commander'
import init from './scripts/init'
import sync from './scripts/sync'
import clean from './scripts/clean'
import { out } from '@elog/shared'
import upgrade from './scripts/upgrade'
import { getPkgJSON } from './utils/utils'
const { pkgJson } = getPkgJSON()

export async function run() {
  program
    .version(pkgJson.version)
    .command('init')
    .option('-c --config <string>', 'rename config file,  default is elog.config.js')
    .option('-e --env <string>', 'rename env file, default is .elog.env')
    .description('init config')
    .action((options) => {
      try {
        void init(options.config, options.env)
      } catch (error: any) {
        out.err('运行失败', error.message)
        process.exit(1)
      }
    })

  program
    .version(pkgJson.version)
    .command('sync')
    .option('-c, --config <string>', 'use config with custom, default is elog.config.js')
    .option('-a --cache <string>', 'use cache file name, default is elog.cache.json')
    .option('-e, --env <string>', 'use env with custom')
    .option('--full-cache', 'cache doc with full info')
    .option('--force', 'sync doc forced')
    .option('--debug', 'enable debug')
    .description('sync doc')
    .action((options) => {
      try {
        void sync(options.config, options.cache, options.env, options.fullCache, options.force)
      } catch (error: any) {
        out.err('运行失败', error.message)
        process.exit(1)
      }
    })

  program
    .version(pkgJson.version)
    .command('clean')
    .option('-c --config <string>', 'assign config file name, default is elog.config.js')
    .option('-a --cache <string>', 'assign cache file name, default is elog.cache.json')
    .description('clean cache')
    .action((options) => {
      try {
        void clean(options.config, options.cache)
      } catch (error: any) {
        out.err('运行失败', error.message)
        process.exit(1)
      }
    })

  program
    .version(pkgJson.version)
    .command('upgrade')
    .description('upgrade version of @elog/cli self')
    .action(() => {
      try {
        upgrade()
      } catch (error: any) {
        out.err('更新失败', error.message)
        process.exit(1)
      }
    })

  program.parse()
}
