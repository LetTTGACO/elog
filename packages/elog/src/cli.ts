import { Command } from 'commander';
import { runExportCommand } from './commands/export';
import { runInitCommand } from './commands/init';
import { runSyncCommand } from './commands/sync';
import out from './logging/logger';
import packageJson from '../package.json' with { type: 'json' };

async function handleAction(action: () => Promise<void> | void): Promise<void> {
  try {
    await action();
  } catch (error: unknown) {
    process.exitCode = 1;
    const message = error instanceof Error ? error.message : String(error);
    out.warn(message);
  }
}

export function createProgram(): Command {
  const program = new Command();

  program.version(packageJson.version);

  program
    .command('init')
    .option('--name <string>', 'custom config name')
    .option('--dry-run', 'print generated output without installing or writing files')
    .description('init config')
    .action((options: { name?: string; dryRun?: boolean }) =>
      handleAction(() =>
        runInitCommand({
          cwd: process.cwd(),
          configName: options.name ?? 'elog.config.ts',
          dryRun: options.dryRun ?? false,
        }),
      ),
    );

  program
    .command('export')
    .description('export docs once without writing config files')
    .action(() =>
      handleAction(() =>
        runExportCommand({
          cwd: process.cwd(),
        }),
      ),
    );

  program
    .command('sync')
    .option('-c --config <string>', 'use config with custom, default is elog.config.ts')
    .option('-e, --env <string>', 'use env with custom')
    .option('--debug', 'enable debug')
    .description('sync doc')
    .action((options: { config?: string; env?: string; debug?: boolean }) =>
      handleAction(() => runSyncCommand(options.config, options.env, options.debug)),
    );

  return program;
}

export async function run(): Promise<void> {
  createProgram().parse();
}
