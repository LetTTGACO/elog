import fs from 'fs';
import path from 'path';
import { InitCommandError } from './registry';

export interface EnsureEnvIgnoredOptions {
  cwd: string;
  shouldAdd: () => boolean | Promise<boolean>;
}

function gitignorePath(cwd: string): string {
  return path.join(cwd, '.gitignore');
}

export function isEnvIgnored(cwd: string): boolean {
  const filePath = gitignorePath(cwd);
  if (!fs.existsSync(filePath)) {
    return false;
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === '.env' || line === '*.env');
}

export async function ensureEnvIgnored(options: EnsureEnvIgnoredOptions): Promise<boolean> {
  if (isEnvIgnored(options.cwd)) {
    return false;
  }
  if (!(await options.shouldAdd())) {
    return false;
  }

  try {
    const filePath = gitignorePath(options.cwd);
    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    const separator = current.length === 0 || current.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(filePath, `${current}${separator}.env\n`, 'utf8');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new InitCommandError('GITIGNORE_WRITE_FAILED', message);
  }
}
