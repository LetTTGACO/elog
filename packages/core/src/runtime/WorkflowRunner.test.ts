import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocSyncStatus } from '../const';
import type { ElogPluginError } from '../plugins/errors';
import type { FromPlugin, ToPlugin } from '../plugins/types';
import type { RuntimeWorkflowConfig } from './types';
import { WorkflowRunner } from './WorkflowRunner';

let tempDir = '';

function makeWorkflow(
  id: string,
  options: { disabled?: boolean; calls?: string[]; failDeploy?: boolean } = {},
): RuntimeWorkflowConfig {
  const from: FromPlugin = {
    name: `from:${id}`,
    kind: 'from',
    async download() {
      options.calls?.push(`download:${id}`);
      return {
        docDetailList: [
          {
            id,
            title: id,
            updateTime: 1,
            body: `body-${id}`,
            properties: { title: id, urlname: id },
          },
        ],
        sortedDocList: [{ id, updateTime: 1 }],
        docStatusMap: { [id]: { _updateIndex: -1, _status: DocSyncStatus.NEW } },
      };
    },
  };
  const to: ToPlugin = {
    name: `to:${id}`,
    kind: 'to',
    deploy() {
      options.calls?.push(`deploy:${id}`);
      if (options.failDeploy) {
        throw new Error(`deploy failed:${id}`);
      }
    },
  };

  return {
    id,
    disabled: options.disabled ?? false,
    cache: {
      disabled: true,
      writeDisabled: false,
      filePath: path.join(tempDir, `${id}.cache.json`),
    },
    from,
    transforms: [],
    to: [to],
    deployStrategy: 'serial',
  };
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = '';
  }
});

describe('WorkflowRunner', () => {
  it('returns skipped result for disabled workflows', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-runner-'));
    const result = await new WorkflowRunner().runAll([
      makeWorkflow('workflow-1', { disabled: true }),
    ]);

    expect(result).toEqual([
      {
        status: 'skipped',
        workflowId: 'workflow-1',
        reason: 'disabled',
      },
    ]);
  });

  it('runs workflows serially in order', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-runner-'));
    const calls: string[] = [];
    const result = await new WorkflowRunner().runAll([
      makeWorkflow('workflow-1', { calls }),
      makeWorkflow('workflow-2', { calls }),
    ]);

    expect(result.map((item) => item.workflowId)).toEqual(['workflow-1', 'workflow-2']);
    expect(result.map((item) => item.status)).toEqual(['success', 'success']);
    expect(calls).toEqual([
      'download:workflow-1',
      'deploy:workflow-1',
      'download:workflow-2',
      'deploy:workflow-2',
    ]);
  });

  it('stops after the first failed workflow', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-runner-'));
    const calls: string[] = [];
    const result = await new WorkflowRunner().runAll([
      makeWorkflow('workflow-1', { calls, failDeploy: true }),
      makeWorkflow('workflow-2', { calls }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('failed');
    expect(result[0].workflowId).toBe('workflow-1');
    expect(result[0]).toMatchObject({
      error: {
        name: 'ElogPluginError',
        pluginName: 'to:workflow-1',
        hookName: 'deploy',
      } as Partial<ElogPluginError>,
    });
    expect(calls).toEqual(['download:workflow-1', 'deploy:workflow-1']);
  });
});
