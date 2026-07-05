import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import {
  imageExpectedFromProfile,
  imageRequiredEnvFromProfile,
} from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

function collectFiles(directory: string, predicate: (file: string) => boolean): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath, predicate));
    } else if (entry.isFile() && predicate(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function readMarkdownOutput(workspace: string): string {
  return collectFiles(
    path.join(workspace, e2eProfile.docOutputDir),
    (file) => path.extname(file) === '.md',
  )
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
}

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: `FlowUs source -> ${e2eProfile.image.kind} image transform -> local deploy`,
  requiredEnv: ['ELOG_E2E_FLOWUS_TABLE_PAGE_ID', ...imageRequiredEnvFromProfile(e2eProfile.image)],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: e2eProfile.cacheFile,
    outputDir: e2eProfile.docOutputDir,
    minMarkdownFiles: 1,
    ...imageExpectedFromProfile(e2eProfile.image),
  },
  assert({ secondRun, workspace }) {
    if (e2eProfile.image.kind === 'local') {
      const imageFiles = collectFiles(path.join(workspace, e2eProfile.image.outputDir), () => true);
      expect(
        imageFiles.some((file) =>
          /\.(png|jpe?g|gif|webp|svg)\.(png|jpe?g|gif|webp|svg)$/i.test(file),
        ),
      ).toBe(false);
    } else {
      const host = process.env.ELOG_E2E_R2_HOST;
      const markdown = readMarkdownOutput(workspace);

      if (!host) {
        throw new Error('ELOG_E2E_R2_HOST is required for FlowUs R2 e2e');
      }
      expect(markdown).toContain(host.replace(/^https?:\/\//, '').replace(/\/+$/, ''));
      expect(markdown).not.toMatch(/flowus\.(cn|net\.cn)/);
    }

    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
