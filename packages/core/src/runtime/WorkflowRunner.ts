import { Graph } from './Graph';
import type { RuntimeWorkflowConfig, WorkflowResult } from './types';

/** 按配置顺序运行多个工作流，并在失败时保留已完成结果。 */
export class WorkflowRunner {
  /** 默认失败即停，避免后续工作流在共享外部资源上继续产生副作用。 */
  async runAll(workflows: RuntimeWorkflowConfig[]): Promise<WorkflowResult[]> {
    const results: WorkflowResult[] = [];

    for (const workflow of workflows) {
      // disabled 工作流仍返回 skipped，便于调用方完整展示配置执行情况。
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
