import path from 'path';
import dotenv from 'dotenv';
import { findConfig } from '../../config/find';
import elog from '../../node-entry';
import out from '../../logging/logger';
import { reportWorkflowResults, throwOnFailedWorkflow } from './results';

/** 执行 sync 命令，CLI 只负责加载环境、配置和展示结果。 */
export async function runSyncCommand(
  customConfigPath?: string,
  envPath?: string,
  enableDebug?: boolean,
): Promise<void> {
  if (enableDebug) {
    // DEBUG 环境变量是全局日志开关，需在配置加载前设置。
    process.env.DEBUG = 'true';
  }

  const rootDir = process.cwd();

  if (envPath) {
    const resolvedEnvPath = path.resolve(rootDir, envPath);
    out.info('环境变量', `已指定读取env文件为：${resolvedEnvPath}`);
    // 用户显式指定 env 时允许覆盖系统环境，方便本地调试不同账号。
    dotenv.config({ override: true, path: resolvedEnvPath });
  } else {
    out.info('环境变量', '未指定env文件，将从系统环境变量中读取');
  }

  const userConfig = await findConfig(customConfigPath);
  const results = await elog(userConfig);

  reportWorkflowResults(results);
  throwOnFailedWorkflow(results);
}
