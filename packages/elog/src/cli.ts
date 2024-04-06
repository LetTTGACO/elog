import { program } from 'commander';
import init from './commands/init';
import sync from './commands/sync';
import out from './utils/logger';
import packageJson from '../package.json' assert { type: 'json' };

export async function run() {
  program
    .version(packageJson.version)
    .command('init')
    .option('--template <string>', 'init with template')
    .option('--name <string>', 'custom config name')
    .description('init config')
    .action((options) => {
      try {
        void init(options.template, options.name);
      } catch (error: any) {
        out.error(error.message);
      }
    });

  program
    .command('sync')
    .option('-c --config <string>', 'use config with custom, default is elog.config.ts')
    .option('-a --cache <string>', 'use cache file name, default is elog.cache.json')
    .option('-e, --env <string>', 'use env with custom')
    .option('--disable-cache', 'sync doc without cache')
    .option('--debug', 'enable debug')
    .description('sync doc')
    .action((options) => {
      try {
        void sync(options.config, options.cache, options.env, options.disableCache);
      } catch (error: any) {
        out.error(error.message);
      }
    });

  program.parse();
}
