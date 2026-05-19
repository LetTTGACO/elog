import fs from 'fs';
import path from 'path';
import { InitCommandError } from './registry';
import type { GeneratedInitFiles } from './types';

export interface GeneratedFileWrite {
  targetPath: string;
  content: string;
  backupPath?: string;
}

export interface PlanGeneratedFileWritesOptions {
  cwd: string;
  configName: string;
  files: GeneratedInitFiles;
  timestamp: string;
}

export interface WriteGeneratedFilesOptions extends PlanGeneratedFileWritesOptions {
  overwriteExisting: (filename: string) => boolean | Promise<boolean>;
}

function backupName(filename: string, timestamp: string, configName: string): string {
  if (filename === configName && configName.endsWith('.ts')) {
    const base = configName.slice(0, -'.ts'.length);
    return `${base}.backup.${timestamp}.ts`;
  }
  return `${filename}.backup.${timestamp}`;
}

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
    // Note: writes are not atomic — if a write fails partway through, previously
    // overwritten files remain on disk without rollback. This is an intentional
    // trade-off; backups exist for recovery and the init command is non-destructive.
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
