import { expect } from 'vitest';
import { imageExpectedFromProfile } from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Notion source -> Halo deploy',
  requiredEnv: [
    'ELOG_E2E_NOTION_TOKEN',
    'ELOG_E2E_NOTION_DATA_SOURCE_ID',
    'ELOG_E2E_HALO_ENDPOINT',
    'ELOG_E2E_HALO_TOKEN',
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: e2eProfile.cacheFile,
    ...imageExpectedFromProfile(e2eProfile.image),
  },
  assert({ secondRun }) {
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
