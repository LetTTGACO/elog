import fs from 'fs';
import path from 'path';
import { InitCommandError } from './registry';
import type { GeneratedInitFiles } from './types';

/** 计划写入的文件信息，backupPath 存在时表示会先备份旧文件。 */
export interface GeneratedFileWrite {
  targetPath: string;
  content: string;
  backupPath?: string;
}

/** 生成写入计划所需信息，真正写盘前先计算目标和备份路径。 */
export interface PlanGeneratedFileWritesOptions {
  cwd: string;
  configName: string;
  files: GeneratedInitFiles;
  timestamp: string;
}

/** 写入文件时额外注入覆写确认，便于 CLI 交互和测试替换。 */
export interface WriteGeneratedFilesOptions extends PlanGeneratedFileWritesOptions {
  overwriteExisting: (filename: string) => boolean | Promise<boolean>;
}

/** 配置文件备份名保留原扩展名，便于编辑器继续识别 TypeScript 配置。 */
function backupName(filename: string, timestamp: string, configName: string): string {
  if (filename === configName && configName.endsWith('.ts')) {
    const base = configName.slice(0, -'.ts'.length);
    return `${base}.backup.${timestamp}.ts`;
  }
  return `${filename}.backup.${timestamp}`;
}

/** 只规划文件写入，不产生副作用，供 dry-run 和测试检查目标路径。 */
export function planGeneratedFileWrites(
  options: PlanGeneratedFileWritesOptions,
): GeneratedFileWrite[] {
  const targets = [{ filename: options.configName, content: options.files.configText }];

  return targets.map((target) => {
    const targetPath = path.join(options.cwd, target.filename);
    return {
      targetPath,
      content: target.content,
      backupPath: fs.existsSync(targetPath)
        ? path.join(options.cwd, backupName(target.filename, options.timestamp, options.configName))
        : undefined,
    };
  });
}

/** 写入 init 生成文件；已有文件先确认并备份，再覆写新内容。 */
export async function writeGeneratedFiles(
  options: WriteGeneratedFilesOptions,
): Promise<GeneratedFileWrite[]> {
  const plan = planGeneratedFileWrites(options);

  for (const item of plan) {
    if (!item.backupPath) {
      continue;
    }
    const filename = path.basename(item.targetPath);
    if (!(await options.overwriteExisting(filename))) {
      throw new InitCommandError(
        'CONFIG_EXISTS_ABORTED',
        `User declined to overwrite ${filename}.`,
      );
    }
  }

  try {
    // 写入不是原子操作：失败时不回滚已写文件，依靠备份降低恢复成本。
    for (const item of plan) {
      if (item.backupPath) {
        fs.copyFileSync(item.targetPath, item.backupPath);
      }
      fs.writeFileSync(item.targetPath, item.content, 'utf8');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new InitCommandError('CONFIG_WRITE_FAILED', message);
  }

  return plan;
}

/** 生成文件备份时间戳，格式保持紧凑以便嵌入文件名。 */
export function createTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}
