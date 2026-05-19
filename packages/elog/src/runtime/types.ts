import type { SortedDoc } from '../types/doc';
import type { ElogError } from '../plugins/errors';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';

export interface CacheConfig {
  disabled: boolean;
  writeDisabled: boolean;
  filePath: string;
}

export interface RuntimeWorkflowConfig {
  id: string;
  disabled: boolean;
  cache: CacheConfig;
  from: FromPlugin;
  transforms: TransformPlugin[];
  to: ToPlugin[];
  deployStrategy: 'serial' | 'parallel';
}

export type WorkflowResult =
  | {
      status: 'success';
      workflowId: string;
      syncedCount: number;
      cacheFilePath: string;
      sortedDocList: SortedDoc<unknown>[];
    }
  | {
      status: 'skipped';
      workflowId: string;
      reason: 'disabled' | 'no-changes';
    }
  | {
      status: 'failed';
      workflowId: string;
      error: ElogError;
    };
