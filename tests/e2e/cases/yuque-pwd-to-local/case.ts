import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import {
  imageExpectedFromProfile,
  imageRequiredEnvFromProfile,
} from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile } from './elog.config';

const imageLinkPattern = /!\[[^\]]*]\(([^)]+)\)/g;
const imageFilePattern = /\.(png|jpe?g|gif|webp|svg)([#?].*)?$/i;

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

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function expectPathFollowDocImageLinks(workspace: string): void {
  if (e2eProfile.image.kind !== 'local' || !e2eProfile.image.pathFollowDoc?.enable) {
    return;
  }

  const docDir = path.join(workspace, e2eProfile.docOutputDir);
  const imageDir = path.join(workspace, e2eProfile.image.outputDir);
  const imageLinks: { file: string; href: string; expectedPrefix: string }[] = [];

  for (const markdownFile of collectMarkdownFiles(docDir)) {
    const content = fs.readFileSync(markdownFile, 'utf8');
    const expectedPrefix = toPosixPath(path.relative(path.dirname(markdownFile), imageDir));

    for (const match of content.matchAll(imageLinkPattern)) {
      const href = match[1];

      if (
        /^(https?:)?\/\//.test(href) ||
        href.startsWith('data:') ||
        !imageFilePattern.test(href)
      ) {
        continue;
      }

      imageLinks.push({ file: markdownFile, href, expectedPrefix });
    }
  }

  expect(imageLinks.length).toBeGreaterThan(0);
  expect(
    imageLinks.some(({ file }) => path.dirname(file) !== docDir),
    'TOC repo should include image links in nested docs',
  ).toBe(true);

  for (const { href, expectedPrefix } of imageLinks) {
    expect(href.startsWith(`${expectedPrefix}/`)).toBe(true);
  }
}

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Yuque password source -> local deploy',
  requiredEnv: [
    'ELOG_E2E_YUQUE_USERNAME',
    'ELOG_E2E_YUQUE_PWD',
    'ELOG_E2E_YUQUE_LOGIN',
    'ELOG_E2E_YUQUE_REPO_TOC',
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
    expectPathFollowDocImageLinks(workspace);
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
};

export default syncCase;
