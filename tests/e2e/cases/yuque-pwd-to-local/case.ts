import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import {
  imageExpectedFromProfile,
  imageRequiredEnvFromProfile,
} from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { e2eProfile, imageProfiles, type E2eImageProfile } from './elog.config';

const imageLinkPattern = /!\[[^\]]*]\(([^)]+)\)/g;

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

function collectImageLinks(workspace: string): { file: string; href: string }[] {
  const docDir = path.join(workspace, e2eProfile.docOutputDir);
  return collectMarkdownFiles(docDir).flatMap((file) =>
    [...fs.readFileSync(file, 'utf8').matchAll(imageLinkPattern)].map((match) => ({
      file,
      href: match[1],
    })),
  );
}

function expectLocalImageLinks(workspace: string, image: E2eImageProfile): void {
  if (image.kind !== 'local') return;
  const docDir = path.join(workspace, e2eProfile.docOutputDir);
  const imageDir = path.join(workspace, image.outputDir);
  const imageLinks = collectImageLinks(workspace);
  expect(imageLinks.length).toBeGreaterThan(0);
  if (image.pathFollowDoc?.enable) {
    expect(
      imageLinks.some(({ file }) => path.dirname(file) !== docDir),
      'TOC repo should include image links in nested docs',
    ).toBe(true);
  }

  for (const { file, href } of imageLinks) {
    const expectedPrefix = toPosixPath(path.relative(path.dirname(file), imageDir));
    expect(href.startsWith(`${expectedPrefix}/`), file).toBe(true);
    const imagePath = path.resolve(path.dirname(file), href);
    expect(fs.existsSync(imagePath), file).toBe(true);
    expect(fs.statSync(imagePath).isFile(), file).toBe(true);
    expect(fs.statSync(imagePath).size, file).toBeGreaterThan(0);
  }
}

function expectCloudImageLinks(workspace: string, image: E2eImageProfile): void {
  if (image.kind === 'local') return;
  const env = process.env;
  const githubHost = env.ELOG_E2E_GITHUB_HOST?.includes('cdn.jsdelivr.net')
    ? 'https://cdn.jsdelivr.net'
    : env.ELOG_E2E_GITHUB_HOST;
  const base = {
    b2: env.ELOG_E2E_B2_HOST,
    cos:
      env.ELOG_E2E_COS_HOST ||
      `${env.ELOG_E2E_COS_BUCKET}.cos.${env.ELOG_E2E_COS_REGION}.myqcloud.com`,
    github: githubHost
      ? `${githubHost}/gh/${env.ELOG_E2E_GITHUB_USER}/${env.ELOG_E2E_GITHUB_REPO}`
      : `https://raw.githubusercontent.com/${env.ELOG_E2E_GITHUB_USER}/${env.ELOG_E2E_GITHUB_REPO}`,
    oss:
      env.ELOG_E2E_OSS_HOST || `${env.ELOG_E2E_OSS_BUCKET}.${env.ELOG_E2E_OSS_REGION}.aliyuncs.com`,
    qiniu: env.ELOG_E2E_QINIU_HOST,
    r2: env.ELOG_E2E_R2_HOST,
    upyun: env.ELOG_E2E_UPYUN_HOST || `http://${env.ELOG_E2E_UPYUN_BUCKET}.test.upcdn.net`,
  }[image.kind];
  if (!base) throw new Error(`Missing public image host for ${image.kind}`);
  const expectedUrl = new URL(/^https?:\/\//.test(base) ? base : `https://${base}`);
  const basePath = expectedUrl.pathname.replace(/\/+$/, '');
  const prefix = image.prefixKey?.replace(/^\/+|\/+$/g, '') ?? '';
  const imageLinks = collectImageLinks(workspace);
  expect(imageLinks.length).toBeGreaterThan(0);

  for (const { file, href } of imageLinks) {
    const url = new URL(href);
    expect(url.origin, file).toBe(expectedUrl.origin);
    expect(url.pathname.startsWith(`${basePath}/`), file).toBe(true);
    if (image.kind === 'github' && !githubHost && prefix) {
      // GitHub returns a branch segment between the repository and the upload prefix.
      expect(url.pathname.slice(basePath.length).includes(`/${prefix}/`), file).toBe(true);
    } else {
      expect(url.pathname.startsWith(`${basePath}/${prefix ? `${prefix}/` : ''}`), file).toBe(true);
    }
  }
}

const selectedImage =
  !process.env.ELOG_E2E_CASE || process.env.ELOG_E2E_CASE === e2eProfile.id
    ? process.env.ELOG_E2E_IMAGE
    : undefined;
const profiles = selectedImage
  ? [e2eProfile.image]
  : ['local', 'cos', 'github', 'oss', 'qiniu', 'r2', 'upyun'].map(
      (kind) => imageProfiles[kind as keyof typeof imageProfiles],
    );

const syncCases: SyncCase[] = profiles.map((image) => ({
  id: e2eProfile.id,
  title: `Yuque password source -> ${image.kind} image transform -> local deploy`,
  env: { ELOG_E2E_IMAGE: image.kind },
  requiredEnv: [
    'ELOG_E2E_YUQUE_USERNAME',
    'ELOG_E2E_YUQUE_PWD',
    'ELOG_E2E_YUQUE_LOGIN',
    'ELOG_E2E_YUQUE_REPO_TOC',
    ...imageRequiredEnvFromProfile(image),
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: e2eProfile.cacheFile,
    outputDir: e2eProfile.docOutputDir,
    minMarkdownFiles: 1,
    ...imageExpectedFromProfile(image),
  },
  assert({ secondRun, workspace }) {
    expectCloudImageLinks(workspace, image);
    expectLocalImageLinks(workspace, image);
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
  },
}));

export default syncCases;
