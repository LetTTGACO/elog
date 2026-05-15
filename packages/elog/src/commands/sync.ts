import path from 'path';
import dotenv from 'dotenv';
import { findConfig } from '../utils/find-config';
import elog from '../node-entry';
import out from '../utils/logger';
import type { WorkflowResult } from '../runtime/types';

export function formatWorkflowResults(results: WorkflowResult[]): string[] {
  return results.map((result) => {
    if (result.status === 'success') {
      return `${result.workflowId}: synced ${result.syncedCount} document(s), cache ${result.cacheFilePath}`;
    }

    if (result.status === 'skipped') {
      return `${result.workflowId}: skipped (${result.reason})`;
    }

    return `${result.workflowId}: failed (${result.error.message})`;
  });
}

/**
 * 同步
 * @param customConfigPath
 * @param envPath
 * @param enableDebug DEBUG 模式
 */
const sync = async (customConfigPath?: string, envPath?: string, enableDebug?: boolean) => {
  if (enableDebug) {
    process.env.DEBUG = 'true';
  }

  const rootDir = process.cwd();

  if (envPath) {
    envPath = path.resolve(rootDir, envPath);
    out.info('环境变量', `已指定读取env文件为：${envPath}`);
    dotenv.config({ override: true, path: envPath });
  } else {
    out.info('环境变量', `未指定env文件，将从系统环境变量中读取`);
  }

  const userConfig = await findConfig(customConfigPath);
  const results = await elog(userConfig!);

  for (const line of formatWorkflowResults(results)) {
    out.info('同步结果', line);
  }

  const failed = results.find((result) => result.status === 'failed');
  if (failed) {
    out.error(failed.error.message);
  }
};

export default sync;
