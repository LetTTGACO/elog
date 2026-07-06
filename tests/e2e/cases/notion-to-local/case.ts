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

function expectR2ImageLinks(workspace: string): void {
  if (e2eProfile.image.kind !== 'r2') return;

  const host = process.env.ELOG_E2E_R2_HOST;
  if (!host) {
    throw new Error('ELOG_E2E_R2_HOST is required for Notion R2 e2e');
  }

  const normalizedHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const markdown = collectMarkdownFiles(path.join(workspace, e2eProfile.docOutputDir))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');

  expect(markdown).toContain(normalizedHost);
}

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Notion source -> local deploy',
  requiredEnv: [
    'ELOG_E2E_NOTION_TOKEN',
    'ELOG_E2E_NOTION_DATABASE_ID',
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
    expectR2ImageLinks(workspace);
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
