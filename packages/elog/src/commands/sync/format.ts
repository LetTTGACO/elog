import type { WorkflowResult } from '../../runtime/types';

/** 将结构化工作流结果格式化为终端输出文本。 */
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
