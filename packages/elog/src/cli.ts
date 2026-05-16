import { program } from 'commander';
import { runInitCommand } from './commands/init';
import sync from './commands/sync';
import out from './logging/logger';
import packageJson from '../package.json' with { type: 'json' };

export async function run() {
  program
    .version(packageJson.version)
    .command('init')
    .option('--template <string>', 'init with template')
    .option('--name <string>', 'custom config name')
    .description('init config')
    .action(async (options) => {
      try {
        await runInitCommand({
          cwd: process.cwd(),
          configName: options.name ?? 'elog.config.ts',
          dryRun: false,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        out.warn('初始化', message);
      }
    });

  program
    .command('sync')
    .option('-c --config <string>', 'use config with custom, default is elog.config.ts')
    .option('-e, --env <string>', 'use env with custom')
    .option('--debug', 'enable debug')
    .description('sync doc')
    .action(async (options) => {
      try {
        await sync(options.config, options.env, options.debug);
      } catch (error: any) {
        out.error(error.message);
      }
    });

  program.parse();
}
