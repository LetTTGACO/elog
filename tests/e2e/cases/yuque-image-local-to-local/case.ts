import { expect } from 'vitest';
import type { SyncCase } from '../../src/helpers/types';

const syncCase: SyncCase = {
  id: 'yuque-image-local-to-local',
  title: 'Yuque password source -> local images -> local deploy',
  requiredEnv: [
    'ELOG_E2E_YUQUE_USERNAME',
    'ELOG_E2E_YUQUE_PWD',
    'ELOG_E2E_YUQUE_LOGIN',
    'ELOG_E2E_YUQUE_REPO',
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: 'elog.cache.json',
    outputDir: 'docs',
    minMarkdownFiles: 1,
    imageDir: 'images',
    minImageFiles: 1,
  },
  assert({ secondRun }) {
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
