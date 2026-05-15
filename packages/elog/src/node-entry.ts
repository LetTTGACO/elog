import { resolveConfig } from './config/resolve';
import { ElogConfigError } from './plugins/errors';
import { WorkflowRunner } from './runtime/WorkflowRunner';
import type { WorkflowResult } from './runtime/types';
import type { InputOptions } from './types/common';

export default elog;

/**
 * 入口命令
 * @param rawInputOptions
 */
export async function elog(rawInputOptions?: InputOptions): Promise<WorkflowResult[]> {
  return elogInternal(rawInputOptions);
}

/**
 * 内部执行
 * @param rawInputOptions
 */
export async function elogInternal(rawInputOptions?: InputOptions): Promise<WorkflowResult[]> {
  if (!rawInputOptions) {
    throw new ElogConfigError('You must supply options to elog');
  }

  const resolved = resolveConfig(rawInputOptions);
  const errorDiagnostic = resolved.diagnostics.find((diagnostic) => diagnostic.level === 'error');
  if (errorDiagnostic) {
    throw new ElogConfigError(errorDiagnostic.message);
  }

  return new WorkflowRunner().runAll(resolved.workflows);
}
