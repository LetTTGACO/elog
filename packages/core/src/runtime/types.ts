import type { SortedDoc } from '../types/doc';
import type { ElogError } from '../plugins/errors';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../plugins/types';

/** 缓存运行时配置由用户配置归一化而来，运行链路只读取这个结构。 */
export interface CacheConfig {
  disabled: boolean;
  writeDisabled: boolean;
  filePath: string;
}

/** 单个工作流的完整运行时形态，插件在这里已经完成数组化和默认值填充。 */
export interface RuntimeWorkflowConfig {
  id: string;
  disabled: boolean;
  cache: CacheConfig;
  from: FromPlugin;
  transforms: TransformPlugin[];
  to: ToPlugin[];
  deployStrategy: 'serial' | 'parallel';
}

/** 工作流对外只返回结构化状态，CLI 再决定如何展示和退出。 */
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
