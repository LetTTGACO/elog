import fs from 'fs';
import path from 'path';
import { parse } from 'dotenv';
import { InitCommandError } from './registry';
import { renderEnvText } from './generator';
import type { EnvValue } from './generator';

type EnvVariable = Pick<EnvValue, 'name' | 'description'>;

const envSetupGuide = [
  '# 以下变量需前往对应平台获取或配置，请参考教程后填写。',
  '# 获取与配置教程：https://elog.1874.cool/notion/gvnxobqogetukays',
  '',
  '',
].join('\n');

export interface EnvFilePlan {
  created: boolean;
  added: string[];
  append: string;
}

/** 只分析变量名，保留原文件字节；预览和日志不会携带已有密钥。 */
export function planEnvFile(cwd: string, variables: EnvVariable[]): EnvFilePlan {
  try {
    const target = path.join(cwd, '.env');
    const stat = fs.lstatSync(target, { throwIfNoEntry: false });
    const exists = stat !== undefined;
    if (stat && !stat.isFile()) {
      throw new Error('.env 不是普通文件');
    }
    const current = exists ? fs.readFileSync(target, 'utf8') : '';
    const values = parse(current);
    const missing = new Map<string, EnvVariable>();
    for (const variable of variables) {
      if (!Object.hasOwn(values, variable.name) && !missing.has(variable.name)) {
        missing.set(variable.name, variable);
      }
    }
    const added = [...missing.keys()];
    if (added.some((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
      throw new Error('插件声明了无效的环境变量名');
    }
    const newline = current.includes('\r\n') ? '\r\n' : '\n';
    const separator = current && !current.endsWith('\n') ? newline : '';
    return {
      created: !exists && added.length > 0,
      added,
      append: added.length
        ? separator +
          (
            envSetupGuide +
            renderEnvText(
              [...missing.values()].map((variable) => ({ ...variable, value: '' })),
              false,
            )
          ).replace(/\n/g, newline)
        : '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new InitCommandError('ENV_READ_FAILED', `无法读取 .env：${message}`);
  }
}

/** 写入前重新读取，只追加当时仍缺失的变量，不重写已有值和注释。 */
export function writeEnvFile(cwd: string, variables: EnvVariable[]): EnvFilePlan {
  const plan = planEnvFile(cwd, variables);
  if (plan.append) {
    try {
      fs.appendFileSync(path.join(cwd, '.env'), plan.append, { encoding: 'utf8', mode: 0o600 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InitCommandError('ENV_WRITE_FAILED', `无法补充 .env：${message}`);
    }
  }
  return plan;
}
