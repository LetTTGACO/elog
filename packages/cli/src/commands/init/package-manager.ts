import fs from 'fs';
import path from 'path';
import { spawnSync as nodeSpawnSync } from 'child_process';
import { InitCommandError } from './registry';

/** init 支持的包管理器集合，优先从项目现有约定推断。 */
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

/** 可执行安装命令和展示文本分离，便于 CLI 提示用户手动重试。 */
export interface InstallCommand {
  command: string;
  args: string[];
  display: string;
}

/** 安装命令执行器类型，测试可注入假的 spawnSync。 */
export type PackageSpawnSync = (
  command: string,
  args: string[],
  options: { cwd: string; stdio: 'inherit' },
) => { status: number | null; error?: Error };

/** 安装插件依赖所需上下文，packages 允许重复但构建命令会去重。 */
export interface InstallPackagesOptions {
  cwd: string;
  packageManager: PackageManager;
  packages: string[];
  spawnSync?: PackageSpawnSync;
}

/** 检查项目根目录是否存在特定锁文件或配置文件。 */
function hasFile(cwd: string, filename: string): boolean {
  return fs.existsSync(path.join(cwd, filename));
}

/** 优先读取 package.json 的 packageManager 字段，尊重用户项目约定。 */
function readPackageManager(cwd: string): PackageManager | undefined {
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  let packageJson: { packageManager?: string };
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      packageManager?: string;
    };
  } catch {
    return undefined;
  }
  const name = packageJson.packageManager?.split('@')[0];
  if (name === 'pnpm' || name === 'npm' || name === 'yarn' || name === 'bun') {
    return name;
  }
  return undefined;
}

/** 推断当前项目包管理器，无法识别时默认 pnpm 以贴合 monorepo 约定。 */
export function detectPackageManager(cwd: string): PackageManager {
  return (
    readPackageManager(cwd) ??
    (hasFile(cwd, 'pnpm-lock.yaml')
      ? 'pnpm'
      : hasFile(cwd, 'yarn.lock')
        ? 'yarn'
        : hasFile(cwd, 'package-lock.json')
          ? 'npm'
          : hasFile(cwd, 'bun.lockb') || hasFile(cwd, 'bun.lock')
            ? 'bun'
            : 'pnpm')
  );
}

/** 根据包管理器生成安装命令，npm 使用 install，其余使用 add。 */
export function buildInstallCommand(
  packageManager: PackageManager,
  packages: string[],
): InstallCommand {
  const uniquePackages = [...new Set(packages)];
  const verb = packageManager === 'npm' ? 'install' : 'add';
  const args = [verb, ...uniquePackages];
  return {
    command: packageManager,
    args,
    display: [packageManager, ...args].join(' '),
  };
}

/** 执行插件依赖安装，失败时给出可复制的手动安装命令。 */
export function installPackages(options: InstallPackagesOptions): InstallCommand {
  const installCommand = buildInstallCommand(options.packageManager, options.packages);
  const spawnSync: PackageSpawnSync = options.spawnSync ?? nodeSpawnSync;
  const result = spawnSync(installCommand.command, installCommand.args, {
    cwd: options.cwd,
    stdio: 'inherit',
  });

  if (result.error || result.status !== 0) {
    throw new InitCommandError(
      'PACKAGE_INSTALL_FAILED',
      `Package installation failed. Run manually: ${installCommand.display}`,
    );
  }

  return installCommand;
}
