import path from 'path';
import dotenv from 'dotenv';
import { findConfig } from '../../config/find';
import elog from '../../node-entry';
import out from '../../logging/logger';
import type { WorkflowResult } from '../../runtime/types';
import { formatWorkflowResults } from './format';

type FailedWorkflowResult = Extract<WorkflowResult, { status: 'failed' }>;

function isFailedWorkflowResult(result: WorkflowResult): result is FailedWorkflowResult {
  return result.status === 'failed';
}

export async function runSyncCommand(
  customConfigPath?: string,
  envPath?: string,
  enableDebug?: boolean,
): Promise<void> {
  if (enableDebug) {
    process.env.DEBUG = 'true';
  }

  const rootDir = process.cwd();

  if (envPath) {
    const resolvedEnvPath = path.resolve(rootDir, envPath);
    out.info('环境变量', `已指定读取env文件为：${resolvedEnvPath}`);
    dotenv.config({ override: true, path: resolvedEnvPath });
  } else {
    out.info('环境变量', '未指定env文件，将从系统环境变量中读取');
  }

  const userConfig = await findConfig(customConfigPath);
  const results = await elog(userConfig);

  for (const line of formatWorkflowResults(results)) {
    out.info('同步结果', line);
  }

  const failed = results.find(isFailedWorkflowResult);
  if (failed) {
    throw failed.error;
  }
}
