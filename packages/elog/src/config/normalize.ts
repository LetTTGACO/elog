import type { RuntimeWorkflowConfig } from '../runtime/types';
import type { ElogConfig } from '../types/common';

/** 将用户配置统一成运行时工作流数组，集中处理默认值和单/多工作流差异。 */
export function normalizeV1Config(raw: ElogConfig | ElogConfig[]): RuntimeWorkflowConfig[] {
  const configs = Array.isArray(raw) ? raw : [raw];
  // 多工作流默认使用带序号的缓存名，避免默认缓存文件互相覆盖。
  const useIndexedCacheNames = configs.length > 1;

  return configs.map((config, index) => {
    const workflowNumber = index + 1;
    const cacheFilePath =
      config.cacheFilePath ??
      (useIndexedCacheNames ? `elog.cache${workflowNumber}.json` : 'elog.cache.json');

    return {
      id: config.id ?? `workflow-${workflowNumber}`,
      disabled: config.disable ?? false,
      cache: {
        disabled: config.disableCache ?? false,
        writeDisabled: config.disableCacheWrite ?? false,
        filePath: cacheFilePath,
      },
      from: config.from,
      transforms: config.plugins ?? [],
      to: Array.isArray(config.to) ? config.to : [config.to],
      deployStrategy: config.deployStrategy ?? 'serial',
    };
  });
}
