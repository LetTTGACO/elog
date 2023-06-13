import { program } from 'commander'
import init from './scripts/init'
import sync from './scripts/sync'
import clean from './scripts/clean'
import { out } from '@elog/shared'
import upgrade from './scripts/upgrade'

export async function run({ version, name }: { version: string; name: string }) {
  program
    .version(version)
    .command('init')
    .option('-c --config <string>', 'rename config file,  default is elog.config.json')
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
    .version(version)
    .command('sync')
    .option('-c, --config <string>', 'use config with custom, default is elog.config.js')
    .option('-a --cache <string>', 'use cache file name, default is elog.cache.json')
    .option('-e, --env <string>', 'use env with custom')
    .option('--debug', `show debug logs`)
    .description('sync doc')
    .action((options) => {
      try {
        void sync(options.config, options.cache, options.env)
      } catch (error: any) {
        out.err('运行失败', error.message)
        process.exit(1)
      }
    })

  program
    .version(version)
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
    .version(version)
    .command('upgrade')
    .description('upgrade version of @elog/cli self')
    .action(() => {
      try {
        upgrade({ version, name })
      } catch (error: any) {
        out.err('更新失败', error.message)
        process.exit(1)
      }
    })
  program.parse()
}
