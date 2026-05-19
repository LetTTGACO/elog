import out from '../../logging/logger';
import type { WorkflowResult } from '../../runtime/types';
import { formatWorkflowResults } from './format';

type FailedWorkflowResult = Extract<WorkflowResult, { status: 'failed' }>;
type ResultLogger = (head: string, message: string) => void;

function isFailedWorkflowResult(result: WorkflowResult): result is FailedWorkflowResult {
  return result.status === 'failed';
}

export function reportWorkflowResults(
  results: WorkflowResult[],
  log: ResultLogger = out.info,
): void {
  for (const line of formatWorkflowResults(results)) {
    log('同步结果', line);
  }
}

export function throwOnFailedWorkflow(results: WorkflowResult[]): void {
  const failed = results.find(isFailedWorkflowResult);
  if (failed) {
    throw failed.error;
  }
}
