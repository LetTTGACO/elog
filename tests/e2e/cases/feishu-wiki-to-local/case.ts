import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

function collectFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Feishu Wiki source -> local image transform -> local deploy',
  requiredEnv: ['ELOG_E2E_FEISHU_APP_ID', 'ELOG_E2E_FEISHU_APP_SECRET', 'ELOG_E2E_FEISHU_WIKI_ID'],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: e2eProfile.cacheFile,
    outputDir: e2eProfile.docOutputDir,
    minMarkdownFiles: 1,
    imageDir: e2eProfile.image.outputDir,
    minImageFiles: 1,
  },
  assert({ secondRun, workspace }) {
    const imageFiles = collectFiles(path.join(workspace, e2eProfile.image.outputDir));
    expect(
      imageFiles.some((file) =>
        /\.(png|jpe?g|gif|webp|svg)\.(png|jpe?g|gif|webp|svg)$/i.test(file),
      ),
    ).toBe(false);
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
