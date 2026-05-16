import fs from 'fs';
import path from 'path';
import { spawnSync as nodeSpawnSync } from 'child_process';
import { InitCommandError } from './registry';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface InstallCommand {
  command: string;
  args: string[];
  display: string;
}

export interface InstallPackagesOptions {
  cwd: string;
  packageManager: PackageManager;
  packages: string[];
  spawnSync?: typeof nodeSpawnSync;
}

function hasFile(cwd: string, filename: string): boolean {
  return fs.existsSync(path.join(cwd, filename));
}

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

export function installPackages(options: InstallPackagesOptions): InstallCommand {
  const installCommand = buildInstallCommand(options.packageManager, options.packages);
  const spawnSync = options.spawnSync ?? nodeSpawnSync;
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
