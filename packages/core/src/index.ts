import path from 'path';
import dotenv from 'dotenv';
import { defineConfig } from './config/defineConfig';
import { loadConfigFromFile } from './config/load';
import { resolveConfig } from './config/resolve';
import { ElogConfigError } from './plugins/errors';
import { WorkflowRunner } from './runtime/WorkflowRunner';
import type { RuntimeWorkflowConfig, WorkflowResult } from './runtime/types';
import type { RawUserConfig } from './types/common';

export interface SyncOptions {
  cwd?: string;
}

export interface SyncFromConfigOptions {
  cwd?: string;
  configFile?: string;
  envFile?: string;
  debug?: boolean;
}

export default sync;

/** 程序化运行入口：解析用户配置并返回结构化工作流结果。 */
export async function sync(
  rawInputOptions?: RawUserConfig,
  options: SyncOptions = {},
): Promise<WorkflowResult[]> {
  if (!rawInputOptions) {
    throw new ElogConfigError('You must supply options to sync');
  }

  const resolved = resolveConfig(rawInputOptions);
  const errorDiagnostic = resolved.diagnostics.find((diagnostic) => diagnostic.level === 'error');
  if (errorDiagnostic) {
    throw new ElogConfigError(errorDiagnostic.message);
  }

  return new WorkflowRunner().runAll(resolveWorkflowCachePaths(resolved.workflows, options.cwd));
}

/** 加载配置文件和可选 env 文件后运行同步，仍保持库式结构化返回。 */
export async function syncFromConfig(
  options: SyncFromConfigOptions = {},
): Promise<WorkflowResult[]> {
  const cwd = options.cwd ?? process.cwd();

  if (options.debug) {
    process.env.DEBUG = 'true';
  }

  if (options.envFile) {
    dotenv.config({
      override: true,
      path: path.resolve(cwd, options.envFile),
    });
  }

  const config = await loadConfigFromFile(cwd, options.configFile);
  if (!config.data) {
    throw new ElogConfigError('未找到 Elog 配置文件');
  }

  return sync(config.data, { cwd });
}

function resolveWorkflowCachePaths(
  workflows: RuntimeWorkflowConfig[],
  cwd: string | undefined,
): RuntimeWorkflowConfig[] {
  if (!cwd) {
    return workflows;
  }

  return workflows.map((workflow) => {
    const filePath = workflow.cache.filePath;
    return {
      ...workflow,
      cache: {
        ...workflow.cache,
        filePath: path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath),
      },
    };
  });
}

export { defineConfig };
export { loadConfigFromFile } from './config/load';
export { resolveConfig } from './config/resolve';
export { ElogConfigError, ElogError, ElogPluginError } from './plugins/errors';
export type {
  ConfigDiagnostic,
  ElogCacheConfig,
  ElogConfig,
  InputOptions,
  RawUserConfig,
  ResolveConfigResult,
} from './types/common';
export type { WorkflowResult } from './runtime/types';
