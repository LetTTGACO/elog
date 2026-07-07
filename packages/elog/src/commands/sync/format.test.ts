import { describe, expect, it } from 'vitest';
import { ElogError, type WorkflowResult } from '@elog/core';
import { formatWorkflowResults } from './format';

describe('formatWorkflowResults', () => {
  it('formats success, skipped, and failed results', () => {
    const results: WorkflowResult[] = [
      {
        status: 'success',
        workflowId: 'workflow-1',
        syncedCount: 2,
        cacheFilePath: 'elog.cache.json',
        sortedDocList: [],
      },
      { status: 'skipped', workflowId: 'workflow-2', reason: 'no-changes' },
      { status: 'failed', workflowId: 'workflow-3', error: new ElogError('boom') },
    ];

    expect(formatWorkflowResults(results)).toEqual([
      'workflow-1: synced 2 document(s), cache elog.cache.json',
      'workflow-2: skipped (no-changes)',
      'workflow-3: failed (boom)',
    ]);
  });
});
