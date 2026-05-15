import type { RuntimeWorkflowConfig } from '../runtime/types';
import type { ElogConfig } from '../types/common';

export function normalizeV1Config(raw: ElogConfig | ElogConfig[]): RuntimeWorkflowConfig[] {
  const configs = Array.isArray(raw) ? raw : [raw];
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
        filePath: cacheFilePath,
      },
      from: config.from,
      transforms: config.plugins ?? [],
      to: Array.isArray(config.to) ? config.to : [config.to],
      deployStrategy: config.deployStrategy ?? 'serial',
    };
  });
}
