import path from 'path';
import { syncFromConfig } from '@elog/core';
import type { SyncFromConfigOptions, WorkflowResult } from '@elog/core';
import out from '../../logging/logger';
import { reportWorkflowResults, throwOnFailedWorkflow } from './results';

type SyncFromConfig = (options: SyncFromConfigOptions) => Promise<WorkflowResult[]>;
type EnvLogger = (head: string, message: string) => void;

/** sync 命令依赖注入边界，测试可替换 Core 入口和 CLI 输出副作用。 */
export interface RunSyncCommandDependencies {
  cwd?: string;
  syncFromConfig?: SyncFromConfig;
  reportResults?: (results: WorkflowResult[]) => void;
  throwOnFailed?: (results: WorkflowResult[]) => void;
  log?: EnvLogger;
}

/** 执行 sync 命令，CLI 只负责加载环境、配置和展示结果。 */
export async function runSyncCommand(
  customConfigPath?: string,
  envPath?: string,
  enableDebug?: boolean,
  dependencies: RunSyncCommandDependencies = {},
): Promise<void> {
  const rootDir = dependencies.cwd ?? process.cwd();
  const doSyncFromConfig = dependencies.syncFromConfig ?? syncFromConfig;
  const reportResults = dependencies.reportResults ?? reportWorkflowResults;
  const throwOnFailed = dependencies.throwOnFailed ?? throwOnFailedWorkflow;
  const log = dependencies.log ?? out.info;

  if (envPath) {
    const resolvedEnvPath = path.resolve(rootDir, envPath);
    log('环境变量', `已指定读取env文件为：${resolvedEnvPath}`);
  } else {
    log('环境变量', '未指定env文件，将从系统环境变量中读取');
  }

  const results = await doSyncFromConfig({
    cwd: rootDir,
    configFile: customConfigPath,
    envFile: envPath,
    debug: enableDebug,
  });

  reportResults(results);
  throwOnFailed(results);
}
