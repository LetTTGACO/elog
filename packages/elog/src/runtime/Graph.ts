import { CacheStore } from '../cache/CacheStore';
import { createPluginContext } from '../plugins/context';
import { ElogError } from '../plugins/errors';
import { PluginDriver } from './PluginDriver';
import type { RuntimeWorkflowConfig, WorkflowResult } from './types';

export class Graph {
  private readonly workflow: RuntimeWorkflowConfig;

  constructor(workflow: RuntimeWorkflowConfig) {
    this.workflow = workflow;
  }

  async sync(): Promise<WorkflowResult> {
    try {
      const cacheStore = new CacheStore(this.workflow.cache);
      const ctx = createPluginContext({
        workflow: {
          id: this.workflow.id,
          cacheFilePath: this.workflow.cache.filePath,
        },
        cachedDocList: cacheStore.cachedDocList,
      });
      const driver = new PluginDriver(
        {
          from: this.workflow.from,
          transforms: this.workflow.transforms,
          to: this.workflow.to,
        },
        ctx,
      );

      const downloadResult = await driver.runDownloadHook();
      if (downloadResult.docDetailList.length === 0) {
        return {
          status: 'skipped',
          workflowId: this.workflow.id,
          reason: 'no-changes',
        };
      }

      const transformedDocList = await driver.runTransformPipeline(downloadResult.docDetailList);
      cacheStore.update(transformedDocList, downloadResult.docStatusMap);
      await driver.runDeployHooks(transformedDocList, this.workflow.deployStrategy);

      const sortedDocList = downloadResult.sortedDocList ?? [];
      cacheStore.write(sortedDocList);

      return {
        status: 'success',
        workflowId: this.workflow.id,
        syncedCount: transformedDocList.length,
        cacheFilePath: this.workflow.cache.filePath,
        sortedDocList,
      };
    } catch (error) {
      return {
        status: 'failed',
        workflowId: this.workflow.id,
        error: error instanceof ElogError ? error : new ElogError('Workflow failed', error),
      };
    }
  }
}
