import { describe, expect, it, vi } from 'vitest';
import { runSyncCommand } from './command';
import type { WorkflowResult } from '@elog/core';

describe('runSyncCommand', () => {
  it('delegates config-file sync to Core and keeps CLI result handling', async () => {
    const results: WorkflowResult[] = [
      {
        status: 'success',
        workflowId: 'workflow-1',
        syncedCount: 1,
        cacheFilePath: 'elog.cache.json',
        sortedDocList: [],
      },
    ];
    const syncFromConfig = vi.fn(async () => results);
    const reportResults = vi.fn();
    const throwOnFailed = vi.fn();
    const log = vi.fn();

    await runSyncCommand('custom.config.ts', '.env.local', true, {
      syncFromConfig,
      reportResults,
      throwOnFailed,
      log,
      cwd: '/tmp/project',
    });

    expect(syncFromConfig).toHaveBeenCalledWith({
      cwd: '/tmp/project',
      configFile: 'custom.config.ts',
      envFile: '.env.local',
      debug: true,
    });
    expect(log).toHaveBeenCalledWith('环境变量', '已指定读取env文件为：/tmp/project/.env.local');
    expect(reportResults).toHaveBeenCalledWith(results);
    expect(throwOnFailed).toHaveBeenCalledWith(results);
  });
});
