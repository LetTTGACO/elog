import out from '../../logging/logger';
import type { WorkflowResult } from '../../runtime/types';
import { formatWorkflowResults } from './format';

type FailedWorkflowResult = Extract<WorkflowResult, { status: 'failed' }>;
type ResultLogger = (head: string, message: string) => void;

/** 缩小失败结果类型，后续抛错时可安全读取 error。 */
function isFailedWorkflowResult(result: WorkflowResult): result is FailedWorkflowResult {
  return result.status === 'failed';
}

/** 输出所有工作流结果，保持多工作流执行情况完整可见。 */
export function reportWorkflowResults(
  results: WorkflowResult[],
  log: ResultLogger = out.info,
): void {
  for (const line of formatWorkflowResults(results)) {
    log('同步结果', line);
  }
}

/** CLI 结果边界：发现失败工作流后抛出原始 ElogError 交给 action 处理。 */
export function throwOnFailedWorkflow(results: WorkflowResult[]): void {
  const failed = results.find(isFailedWorkflowResult);
  if (failed) {
    throw failed.error;
  }
}
