import { expect } from 'vitest';
import { imageExpectedFromProfile } from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Notion source -> WordPress deploy',
  requiredEnv: [
    'ELOG_E2E_NOTION_TOKEN',
    'ELOG_E2E_NOTION_DATABASE_ID',
    'ELOG_E2E_WORDPRESS_ENDPOINT',
    'ELOG_E2E_WORDPRESS_USERNAME',
    'ELOG_E2E_WORDPRESS_PASSWORD',
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
