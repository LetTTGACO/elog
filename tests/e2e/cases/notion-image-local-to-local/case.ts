import { expect } from 'vitest';
import type { SyncCase } from '../../src/helpers/types';

const syncCase: SyncCase = {
  id: 'notion-image-local-to-local',
  title: 'Notion source -> local images -> local deploy',
  requiredEnv: ['ELOG_E2E_NOTION_TOKEN', 'ELOG_E2E_NOTION_DATA_SOURCE_ID'],
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
