import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

function collectMarkdown(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdown(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }
  return files;
}

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Feishu Space source -> R2 image transform -> local deploy',
  requiredEnv: [
    'ELOG_E2E_FEISHU_APP_ID',
    'ELOG_E2E_FEISHU_APP_SECRET',
    'ELOG_E2E_FEISHU_SPACE_FOLDER_TOKEN',
    'ELOG_E2E_R2_HOST',
    'ELOG_E2E_R2_ACCESS_KEY_ID',
    'ELOG_E2E_R2_SECRET_ACCESS_KEY',
    'ELOG_E2E_R2_BUCKET',
    'ELOG_E2E_R2_ENDPOINT',
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: e2eProfile.cacheFile,
    outputDir: e2eProfile.docOutputDir,
    minMarkdownFiles: 1,
  },
  assert({ secondRun, workspace }) {
    const host = process.env.ELOG_E2E_R2_HOST!.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const markdown = collectMarkdown(path.join(workspace, e2eProfile.docOutputDir)).map((file) =>
      fs.readFileSync(file, 'utf8'),
    );

    expect(markdown.some((content) => content.includes(host))).toBe(true);
    expect(markdown.some((content) => content.includes('data:image/'))).toBe(false);
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
