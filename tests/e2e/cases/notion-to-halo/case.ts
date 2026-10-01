import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { DocDetail } from '@elog/plugin-sdk';
import { expect } from 'vitest';
import { expectExitCode, expectOutputContains, readJsonFile } from '../../src/helpers/assertions';
import { expectHaloPosts, readPublishedHaloPost } from '../../src/helpers/halo-readback';
import {
  imageExpectedFromProfile,
  imageRequiredEnvFromProfile,
} from '../../src/helpers/image-expected';
import type { SyncCase } from '../../src/helpers/types';
import { runElog } from '../../src/helpers/run-cli';
import { e2eProfile } from './elog.config';

async function notionRequest<T>(route: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`https://api.notion.com/v1${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.ELOG_E2E_NOTION_TOKEN}`,
      'Notion-Version': '2026-03-11',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Notion fixture ${method} ${route}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

const syncCase: SyncCase = {
  id: e2eProfile.id,
  title: 'Notion source -> Halo deploy',
  requiredEnv: [
    'ELOG_E2E_NOTION_TOKEN',
    'ELOG_E2E_NOTION_HALO_DATABASE_ID',
    'ELOG_E2E_HALO_ENDPOINT',
    'ELOG_E2E_HALO_TOKEN',
    ...imageRequiredEnvFromProfile(e2eProfile.image),
  ],
  configFile: 'elog.config.ts',
  expected: {
    cacheFile: e2eProfile.cacheFile,
    ...imageExpectedFromProfile(e2eProfile.image),
  },
  async assert({ secondRun, workspace, repoRoot }) {
    expect(secondRun.combinedOutput).toMatch(/skipped|no-change|无变化|跳过|synced 0/i);
    const cachePath = path.join(workspace, e2eProfile.cacheFile);
    const cache = readJsonFile(cachePath) as { cachedDocList: DocDetail[] };
    const credentials = {
      endpoint: process.env.ELOG_E2E_HALO_ENDPOINT!,
      token: process.env.ELOG_E2E_HALO_TOKEN!,
    };
    const image = {
      host: process.env.ELOG_E2E_R2_HOST!,
      prefixKey: e2eProfile.image.prefixKey,
    };
    const original = await expectHaloPosts(cache.cachedDocList, credentials, image);
    const doc = cache.cachedDocList[0]!;
    const marker = `Elog Halo E2E update ${randomUUID()}`;
    let blockId: string | undefined;
    const sync = () =>
      runElog(['sync', '--config', 'elog.config.ts'], { cwd: workspace, repoRoot });
    try {
      // 避免重复运行时，追加段落与源文档的编辑时间落在同一分钟。
      await expect
        .poll(() => Math.floor(Date.now() / 60_000) * 60_000, {
          timeout: 65_000,
          interval: 1_000,
        })
        .not.toBe(doc.updateTime);
      const appended = await notionRequest<{ results: { id: string }[] }>(
        `/blocks/${doc.id}/children`,
        'PATCH',
        {
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: { rich_text: [{ type: 'text', text: { content: marker } }] },
            },
          ],
        },
      );
      blockId = appended.results[0]?.id;
      expect(blockId, 'Notion must return the temporary block id').toBeTruthy();
      await expect
        .poll(
          async () => {
            const page = await notionRequest<{ last_edited_time: string }>(
              `/pages/${doc.id}`,
              'GET',
            );
            return new Date(page.last_edited_time).getTime();
          },
          { timeout: 15_000 },
        )
        .not.toBe(doc.updateTime);
      const updatedRun = await sync();
      expectExitCode(updatedRun, 0);
      expectOutputContains(updatedRun, '更新文档');
      const updated = await readPublishedHaloPost(
        doc.id,
        credentials,
        ({ head, release }) =>
          head.raw.includes(marker) &&
          head.content.includes(marker) &&
          release.content.includes(marker),
      );
      expect(updated.post.metadata.name).toBe(original[0]!.post.metadata.name);
      expect(updated.head.snapshotName).not.toBe(original[0]!.head.snapshotName);
      expect(updated.head.raw).toContain(marker);
      expect(updated.head.content).toContain(marker);
      expect(updated.release.content).toContain(marker);
      const updatedCache = readJsonFile(cachePath) as { cachedDocList: DocDetail[] };
      await expectHaloPosts(updatedCache.cachedDocList, credentials, image);
    } finally {
      if (blockId) {
        await notionRequest(`/blocks/${blockId}`, 'DELETE');
        // Notion 的编辑时间精确到分钟，清理可能与追加发生在同一分钟。
        const restoredCache = readJsonFile(cachePath) as { cachedDocList: DocDetail[] };
        restoredCache.cachedDocList.find((item) => item.id === doc.id)!.updateTime = 0;
        fs.writeFileSync(cachePath, JSON.stringify(restoredCache, null, 2));
        const restoredRun = await sync();
        expectExitCode(restoredRun, 0);
        await readPublishedHaloPost(
          doc.id,
          credentials,
          ({ head, release }) =>
            !head.raw.includes(marker) &&
            !head.content.includes(marker) &&
            !release.content.includes(marker),
        );
        const restored = await expectHaloPosts(restoredCache.cachedDocList, credentials, image);
        expect(restored[0]!.head.raw).toBe(original[0]!.head.raw);
        expect(restored[0]!.head.content).toBe(original[0]!.head.content);
        expect(restored[0]!.release.content).toBe(original[0]!.release.content);
      }
    }
  },
};

export default syncCase;
