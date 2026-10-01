import path from 'node:path';
import type { DocDetail } from '@elog/plugin-sdk';
import { expect } from 'vitest';
import { readJsonFile } from '../../src/helpers/assertions';
import { expectHaloPosts } from '../../src/helpers/halo-readback';
import { imageRequiredEnvFromProfile } from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Feishu Space source -> Halo deploy',
  requiredEnv: [
    'ELOG_E2E_FEISHU_APP_ID',
    'ELOG_E2E_FEISHU_APP_SECRET',
    'ELOG_E2E_FEISHU_SPACE_FOLDER_TOKEN',
    'ELOG_E2E_HALO_ENDPOINT',
    'ELOG_E2E_HALO_TOKEN',
    ...imageRequiredEnvFromProfile(e2eProfile.image),
  ],
  configFile: 'elog.config.ts',
  expected: { cacheFile: e2eProfile.cacheFile },
  async assert({ secondRun, workspace }) {
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
    const cache = readJsonFile(path.join(workspace, e2eProfile.cacheFile)) as {
      cachedDocList: DocDetail[];
    };
    await expectHaloPosts(
      cache.cachedDocList,
      {
        endpoint: process.env.ELOG_E2E_HALO_ENDPOINT!,
        token: process.env.ELOG_E2E_HALO_TOKEN!,
      },
      {
        host: process.env.ELOG_E2E_R2_HOST!,
        prefixKey: e2eProfile.image.prefixKey,
      },
      { minCovers: 0 },
    );
  },
};

export default syncCase;
