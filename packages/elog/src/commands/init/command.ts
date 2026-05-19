import inquirer from 'inquirer';
import out from '../../logging/logger';
import { detectPackageManager, buildInstallCommand, installPackages } from './package-manager';
import type { InstallPackagesOptions } from './package-manager';
import { getPluginsByKind, InitCommandError, loadBuiltInPluginRegistry } from './registry';
import { generateInitFiles } from './generator';
import { createTimestamp, writeGeneratedFiles } from './file-writer';
import type { GeneratedFileWrite, WriteGeneratedFilesOptions } from './file-writer';
import { runPluginSelectionWizard } from './wizard';
import type { GeneratedInitFiles, PluginRegistry, PluginSelection } from './types';

export interface RunInitCommandOptions {
  cwd: string;
  configName: string;
  dryRun: boolean;
  loadRegistry?: () => PluginRegistry;
  runWizard?: (registry: PluginRegistry) => Promise<PluginSelection>;
  installPackages?: (options: InstallPackagesOptions) => ReturnType<typeof installPackages>;
  writeGeneratedFiles?: (options: WriteGeneratedFilesOptions) => Promise<GeneratedFileWrite[]>;
  overwriteExisting?: (filename: string) => Promise<boolean>;
  log?: (message: string) => void;
}

export function selectedPackages(selection: PluginSelection): string[] {
  const allPlugins = [selection.from, ...selection.transforms, ...selection.to];
  const seen = new Set<string>();
  return allPlugins
    .map((plugin) => plugin.packageName)
    .filter((name) => {
      if (seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    });
}

export function createInitDryRunOutput(
  files: GeneratedInitFiles & { installCommand: string },
  configName = 'elog.config.ts',
): string {
  const sections = [
    `Install command:\n${files.installCommand}`,
    `${configName}:\n${files.configText}`,
  ];
  return sections.join('\n\n');
}

export function createDefaultInitSelection(registry: PluginRegistry): PluginSelection {
  const fromEntry = getPluginsByKind(registry, 'from')[0];
  const toEntry = getPluginsByKind(registry, 'to')[0];

  if (!fromEntry || !toEntry) {
    throw new InitCommandError(
      'PLUGIN_SELECTION_EMPTY',
      'Must have at least one source and one target plugin for init dry-run.',
    );
  }

  return {
    from: fromEntry,
    transforms: [],
    to: [toEntry],
  };
}

export async function runInitCommand(options: RunInitCommandOptions): Promise<void> {
  const loadRegistry = options.loadRegistry ?? loadBuiltInPluginRegistry;
  const runWizard = options.runWizard ?? runPluginSelectionWizard;
  const doInstall = options.installPackages ?? installPackages;
  const doWrite = options.writeGeneratedFiles ?? writeGeneratedFiles;
  const log = options.log ?? ((message: string) => out.info('初始化', message));

  const registry = loadRegistry();
  const selection =
    options.dryRun && !options.runWizard
      ? createDefaultInitSelection(registry)
      : await runWizard(registry);
  const files = generateInitFiles(selection);
  const packages = selectedPackages(selection);
  const packageManager = detectPackageManager(options.cwd);
  const installCommand = buildInstallCommand(packageManager, packages);

  if (options.dryRun) {
    log(
      createInitDryRunOutput(
        { ...files, installCommand: installCommand.display },
        options.configName,
      ),
    );
    return;
  }

  doInstall({ cwd: options.cwd, packageManager, packages });

  const defaultConfirmOverwrite = async (filename: string): Promise<boolean> => {
    const answer = (await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `检测到已有 ${filename}，是否覆写？旧文件会自动备份`,
        default: true,
      },
    ])) as { overwrite: boolean };
    return answer.overwrite;
  };

  await doWrite({
    cwd: options.cwd,
    configName: options.configName,
    files,
    timestamp: createTimestamp(),
    overwriteExisting: options.overwriteExisting ?? defaultConfirmOverwrite,
  });

  log(
    `已生成配置文件 ${options.configName}；推荐将 Token 等隐私参数写入 .env 文件，并将 .env 加入 .gitignore。`,
  );
}
