import { Graph } from './Graph';
import type { RuntimeWorkflowConfig, WorkflowResult } from './types';

export class WorkflowRunner {
  async runAll(workflows: RuntimeWorkflowConfig[]): Promise<WorkflowResult[]> {
    const results: WorkflowResult[] = [];

    for (const workflow of workflows) {
      if (workflow.disabled) {
        results.push({
          status: 'skipped',
          workflowId: workflow.id,
          reason: 'disabled',
        });
        continue;
      }

      const result = await new Graph(workflow).sync();
      results.push(result);

      if (result.status === 'failed') {
        break;
      }
    }

    return results;
  }
}
