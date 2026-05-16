import inquirer from 'inquirer';
import out from '../../logging/logger';
import { detectPackageManager, buildInstallCommand, installPackages } from './package-manager';
import type { InstallPackagesOptions } from './package-manager';
import { loadBuiltInPluginRegistry } from './registry';
import { generateInitFiles } from './generator';
import { createTimestamp, writeGeneratedFiles } from './file-writer';
import type { GeneratedFileWrite, WriteGeneratedFilesOptions } from './file-writer';
import { ensureEnvIgnored } from './gitignore';
import type { EnsureEnvIgnoredOptions } from './gitignore';
import { runInitWizard } from './wizard';
import type { GeneratedInitFiles, InitSelection, PluginRegistry } from './types';

export interface RunInitCommandOptions {
  cwd: string;
  configName: string;
  dryRun: boolean;
  loadRegistry?: () => PluginRegistry;
  runWizard?: (registry: PluginRegistry) => Promise<InitSelection>;
  installPackages?: (options: InstallPackagesOptions) => ReturnType<typeof installPackages>;
  writeGeneratedFiles?: (options: WriteGeneratedFilesOptions) => Promise<GeneratedFileWrite[]>;
  overwriteExisting?: (filename: string) => Promise<boolean>;
  ensureEnvIgnored?: (options: EnsureEnvIgnoredOptions) => Promise<boolean>;
  log?: (message: string) => void;
}

export function redactEnvText(envText: string): string {
  return envText
    .split('\n')
    .map((line) => {
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) {
        return line;
      }
      return `${line.slice(0, eqIndex + 1)}<redacted>`;
    })
    .join('\n');
}

export function selectedPackages(selection: InitSelection): string[] {
  const allPlugins = [selection.from, ...selection.transforms, ...selection.to];
  const seen = new Set<string>();
  return allPlugins
    .map((plugin) => plugin.entry.packageName)
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
    `.env (redacted):\n${redactEnvText(files.envText)}`,
    `.env.example:\n${files.envExampleText}`,
  ];
  return sections.join('\n\n');
}

export async function runInitCommand(options: RunInitCommandOptions): Promise<void> {
  const loadRegistry = options.loadRegistry ?? loadBuiltInPluginRegistry;
  const runWizard = options.runWizard ?? runInitWizard;
  const doInstall = options.installPackages ?? installPackages;
  const doWrite = options.writeGeneratedFiles ?? writeGeneratedFiles;
  const doEnsureIgnored = options.ensureEnvIgnored ?? ensureEnvIgnored;
  const log = options.log ?? ((message: string) => out.info('初始化', message));

  const registry = loadRegistry();
  const selection = await runWizard(registry);
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

  const shouldAdd = async (): Promise<boolean> => {
    out.warn('初始化', '.env 包含敏感信息，请不要提交到 GitHub');
    const answer = (await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addEnvToGitignore',
        message: '是否将 .env 添加到 .gitignore？',
        default: true,
      },
    ])) as { addEnvToGitignore: boolean };
    return answer.addEnvToGitignore;
  };

  await doEnsureIgnored({ cwd: options.cwd, shouldAdd });
}
