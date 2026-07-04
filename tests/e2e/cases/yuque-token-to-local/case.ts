import { expect } from 'vitest';
import {
  imageExpectedFromProfile,
  imageRequiredEnvFromProfile,
} from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Yuque token source -> local deploy',
  requiredEnv: [
    'ELOG_E2E_YUQUE_TOKEN',
    'ELOG_E2E_YUQUE_LOGIN',
    'ELOG_E2E_YUQUE_REPO',
    ...imageRequiredEnvFromProfile(e2eProfile.image),
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: e2eProfile.cacheFile,
    outputDir: e2eProfile.docOutputDir,
    minMarkdownFiles: 1,
    ...imageExpectedFromProfile(e2eProfile.image),
  },
  assert({ secondRun }) {
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
