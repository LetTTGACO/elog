import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ignore from 'ignore';
import { InitCommandError } from './registry';

export interface EnvIgnorePlan {
  status: 'ignored' | 'tracked' | 'unignored' | 'created' | 'updated';
  append?: string;
  warning?: string;
}

/** Git 负责仓库内的规则优先级；普通目录使用相同语法分析当前 .gitignore。 */
export function planEnvIgnore(cwd: string): EnvIgnorePlan {
  try {
    const git = (args: string[], input?: string) =>
      spawnSync('git', args, {
        cwd,
        input,
        encoding: 'utf8',
        env: { ...process.env, LC_ALL: 'C' },
      });
    const repository = git(['rev-parse', '--is-inside-work-tree']);
    let warning: string | undefined;
    if (repository.status === 0 && repository.stdout.trim() === 'true') {
      const tracked = git(['ls-files', '-z', '--', '.env']);
      if (tracked.error || tracked.status !== 0) throw new Error('无法检查 .env 的 Git 跟踪状态');
      if (tracked.stdout) return { status: 'tracked' };
      const result = git(['check-ignore', '--no-index', '-v', '-z', '--stdin'], '.env\0');
      if (result.error || (result.status !== 0 && result.status !== 1)) {
        throw new Error('无法检查 .env 的 Git 忽略规则');
      }
      const pattern = result.stdout.split('\0')[2];
      if (pattern) return { status: pattern.startsWith('!') ? 'unignored' : 'ignored' };
    } else if (repository.error || !repository.stderr.includes('not a git repository')) {
      warning = '未能检查 Git 跟踪状态，请确认 .env 未被 Git 跟踪。';
    }

    const target = path.join(cwd, '.gitignore');
    const stat = fs.lstatSync(target, { throwIfNoEntry: false });
    const exists = stat !== undefined;
    if (stat && !stat.isFile()) throw new Error('.gitignore 不是普通文件');
    const current = exists ? fs.readFileSync(target, 'utf8') : '';
    const result = ignore().add(current).test('.env');
    if (result.ignored) return { status: 'ignored', warning };
    if (result.unignored) return { status: 'unignored', warning };
    const newline = current.includes('\r\n') ? '\r\n' : '\n';
    const separator = current && !current.endsWith('\n') ? newline : '';
    return {
      status: exists ? 'updated' : 'created',
      append: `${separator}/.env${newline}`,
      warning,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new InitCommandError('GITIGNORE_CHECK_FAILED', `无法检查 .env 忽略规则：${message}`);
  }
}

/** 仅在普通缺失情形下追加当前目录的 .env 规则。 */
export function ensureEnvIgnored(cwd: string): EnvIgnorePlan {
  const plan = planEnvIgnore(cwd);
  if (plan.append) {
    try {
      fs.appendFileSync(path.join(cwd, '.gitignore'), plan.append, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InitCommandError('GITIGNORE_WRITE_FAILED', `无法更新 .gitignore：${message}`);
    }
  }
  return plan;
}
