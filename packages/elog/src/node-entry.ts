import { resolveConfig } from './config/resolve';
import { ElogConfigError } from './plugins/errors';
import { WorkflowRunner } from './runtime/WorkflowRunner';
import type { WorkflowResult } from './runtime/types';
import type { RawUserConfig } from './types/common';

export default elog;

/**
 * 程序化运行入口，保持与默认导出一致，方便库调用方显式导入。
 * @param rawInputOptions
 */
export async function elog(rawInputOptions?: RawUserConfig): Promise<WorkflowResult[]> {
  return elogInternal(rawInputOptions);
}

/**
 * 内部执行入口，负责配置解析诊断和多工作流运行。
 * @param rawInputOptions
 */
export async function elogInternal(rawInputOptions?: RawUserConfig): Promise<WorkflowResult[]> {
  if (!rawInputOptions) {
    // 库入口不能猜测配置来源，缺少配置时用配置错误提示调用方。
    throw new ElogConfigError('You must supply options to elog');
  }

  const resolved = resolveConfig(rawInputOptions);
  const errorDiagnostic = resolved.diagnostics.find((diagnostic) => diagnostic.level === 'error');
  if (errorDiagnostic) {
    // 诊断在运行前转成配置错误，避免无效配置进入插件执行阶段。
    throw new ElogConfigError(errorDiagnostic.message);
  }

  return new WorkflowRunner().runAll(resolved.workflows);
}
