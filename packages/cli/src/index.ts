import { program } from 'commander'
import init from './scripts/init'
import sync from './scripts/sync'
import clean from './scripts/clean'
import { out } from '@elog/shared'
import pkg from '../package.json'

export async function run() {
  program
    .version(pkg.version)
    .command('init')
    .option('-n, --name <string>', 'rename elog-config.json')
    .description('init config')
    .action((options) => {
      try {
        void init(options.name)
      } catch (error) {
        // @ts-ignore
        out.err('运行失败', error)
        process.exit(1)
      }
    })

  program
    .version(pkg.version)
    .command('sync')
    .option('-c, --config <string>', 'use config with custom')
    .option('-e, --env <string>', 'use env with custom')
    .description('sync doc')
    .action((options) => {
      try {
        void sync(options.config, options.env)
      } catch (error) {
        // @ts-ignore
        out.err('运行失败', error)
        // process.exit(1)
      }
    })

  program
    .version(pkg.version)
    .command('clean')
    .option('-c --config <string>', 'assign config file name, default is elog-config.json')
    .option('-a --cache <string>', 'assign cache file name, default is elog-cache.json')
    .option('-t --timestamp <string>', 'assign timestamp file name, default is elog-timestamp.txt')
    .description('clean cache')
    .action((options) => {
      try {
        void clean(options.config, options.cache, options.timestamp)
      } catch (error) {
        // @ts-ignore
        out.err('运行失败', error)
        process.exit(1)
      }
    })

  program.parse()
}
