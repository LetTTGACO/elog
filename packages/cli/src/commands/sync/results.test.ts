import { describe, expect, it, vi } from 'vitest';
import { reportWorkflowResults, throwOnFailedWorkflow } from './results';
import type { WorkflowResult } from '@elog/core';

describe('reportWorkflowResults', () => {
  it('logs formatted workflow result lines', () => {
    const log = vi.fn();
    const results: WorkflowResult[] = [
      {
        status: 'success',
        workflowId: 'workflow-1',
        syncedCount: 2,
        cacheFilePath: 'elog.cache.json',
        sortedDocList: [],
      },
    ];

    reportWorkflowResults(results, log);

    expect(log).toHaveBeenCalledWith(
      '同步结果',
      'workflow-1: synced 2 document(s), cache elog.cache.json',
    );
  });
});

describe('throwOnFailedWorkflow', () => {
  it('throws the first failed workflow error', () => {
    const error = new Error('deploy failed');
    const results: WorkflowResult[] = [
      {
        status: 'failed',
        workflowId: 'workflow-1',
        error: error as any,
      },
    ];

    expect(() => throwOnFailedWorkflow(results)).toThrow(error);
  });

  it('does not throw when there are no failed workflows', () => {
    const results: WorkflowResult[] = [
      {
        status: 'skipped',
        workflowId: 'workflow-1',
        reason: 'disabled',
      },
    ];

    expect(() => throwOnFailedWorkflow(results)).not.toThrow();
  });
});
