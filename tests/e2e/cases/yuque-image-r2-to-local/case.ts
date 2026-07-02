import { expect } from 'vitest';
import type { SyncCase } from '../../src/helpers/types';

const syncCase: SyncCase = {
  id: 'yuque-image-r2-to-local',
  title: 'Yuque password source -> R2 images -> local deploy',
  requiredEnv: [
    'ELOG_E2E_YUQUE_USERNAME',
    'ELOG_E2E_YUQUE_PWD',
    'ELOG_E2E_YUQUE_LOGIN',
    'ELOG_E2E_YUQUE_REPO',
    'ELOG_E2E_R2_HOST',
    'ELOG_E2E_R2_ACCESS_KEY_ID',
    'ELOG_E2E_R2_SECRET_ACCESS_KEY',
    'ELOG_E2E_R2_BUCKET',
    'ELOG_E2E_R2_ENDPOINT',
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: 'elog.cache.json',
    outputDir: 'docs',
    minMarkdownFiles: 1,
  },
  assert({ secondRun }) {
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
