import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import {
  imageExpectedFromProfile,
  imageRequiredEnvFromProfile,
} from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

function collectMarkdownFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files;
}

function relativePathDepth(baseDir: string, file: string): number {
  return path.relative(baseDir, file).split(path.sep).length;
}

function expectCatalogOutput(workspace: string): void {
  const docDir = path.join(workspace, e2eProfile.docOutputDir);
  const markdownFiles = collectMarkdownFiles(docDir);
  const filesInCatalogDirs = markdownFiles.filter((file) => path.dirname(file) !== docDir);
  const filesInMultiLevelCatalogDirs = markdownFiles.filter(
    (file) => relativePathDepth(docDir, file) >= 3,
  );

  expect(
    filesInCatalogDirs.length,
    'Notion catalog output should contain nested docs',
  ).toBeGreaterThan(0);
  expect(
    filesInMultiLevelCatalogDirs.length,
    'Notion multi-select catalog output should contain multi-level nested docs',
  ).toBeGreaterThan(0);
}

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Notion catalog source -> local deploy with TOC paths',
  requiredEnv: [
    'ELOG_E2E_NOTION_TOKEN',
    'ELOG_E2E_NOTION_CATALOG_DATABASE_ID',
    ...imageRequiredEnvFromProfile(e2eProfile.image),
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: e2eProfile.cacheFile,
    outputDir: e2eProfile.docOutputDir,
    minMarkdownFiles: 1,
    ...imageExpectedFromProfile(e2eProfile.image),
  },
  assert({ secondRun, workspace }) {
    expectCatalogOutput(workspace);
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
