import fs from 'fs';
import path from 'path';
import { InitCommandError } from './registry';

/** .env 忽略检查的依赖注入边界，shouldAdd 用于 CLI 交互确认。 */
export interface EnsureEnvIgnoredOptions {
  cwd: string;
  shouldAdd: () => boolean | Promise<boolean>;
}

/** 集中生成 .gitignore 路径，避免读写分支拼接不一致。 */
function gitignorePath(cwd: string): string {
  return path.join(cwd, '.gitignore');
}

/** 判断项目是否已经忽略 .env 或通配 env 文件。 */
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

/** 必要时把 .env 追加到 .gitignore，保护 init 生成的敏感配置。 */
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
    // 保留已有内容，并在缺少换行时补一个分隔换行。
    const separator = current.length === 0 || current.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(filePath, `${current}${separator}.env\n`, 'utf8');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new InitCommandError('GITIGNORE_WRITE_FAILED', message);
  }
}
