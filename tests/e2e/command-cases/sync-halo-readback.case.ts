import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { expect } from 'vitest';
import { expectExitCode } from '../src/helpers/assertions';
import { expectHaloPosts, type HaloPostReadback } from '../src/helpers/halo-readback';
import { runElog } from '../src/helpers/run-cli';
import type { CommandCase } from '../src/helpers/types';

const imageHost = 'https://cdn.example.com';
const imagePrefix = 'elog-e2e/';
const properties = {
  title: 'Halo readback fixture',
  urlname: 'halo-readback-fixture',
  cover: `${imageHost}/${imagePrefix}cover.png`,
};
const docs = [{ id: 'halo-readback-fixture', properties }];
const env: NodeJS.ProcessEnv = {};
let server: http.Server;
let saved: HaloPostReadback['post'] | undefined;
let content: HaloPostReadback['head'];
let revision = 0;
let createdCount = 0;

const commandCase: CommandCase = {
  id: 'sync-halo-readback',
  command: ['sync', '--config', 'elog.config.ts'],
  env,
  async setup({ workspace }) {
    server = http.createServer(async (request, response) => {
      let body = '';
      for await (const chunk of request) body += chunk;
      const route = new URL(request.url!, 'http://localhost').pathname;
      let result: unknown = {};
      if (request.method === 'POST' && route.endsWith('/posts')) {
        const payload = JSON.parse(body);
        saved = payload.post;
        content = payload.content;
        saved!.spec.headSnapshot = `snapshot-${++revision}`;
        createdCount += 1;
        result = payload;
      } else if (request.method === 'PUT' && route.endsWith('/content')) {
        content = JSON.parse(body);
        saved!.spec.headSnapshot = `snapshot-${++revision}`;
        result = content;
      } else if (request.method === 'PUT' && route.endsWith('/publish')) {
        saved!.spec.releaseSnapshot = saved!.spec.headSnapshot;
        result = saved;
      } else if (request.method === 'PUT') {
        saved = JSON.parse(body);
        result = saved;
      } else if (request.method === 'GET') {
        if (route.endsWith('/head-content')) {
          result = { ...content, snapshotName: saved!.spec.headSnapshot };
        } else if (route.endsWith('/release-content')) {
          result = { ...content, snapshotName: saved!.spec.releaseSnapshot };
        } else if (route.endsWith('/posts/halo-readback-fixture')) {
          result = saved;
        } else if (route === '/apis/api.console.halo.run/v1alpha1/posts') {
          result = { items: saved ? [{ post: saved }] : [] };
        } else {
          result = { items: [] };
        }
      }
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(result));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    server.unref();
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing mock Halo address');
    env.HALO_ENDPOINT = `http://127.0.0.1:${address.port}`;
    env.HALO_TOKEN = 'fixture-token';
    fs.writeFileSync(
      path.join(workspace, 'elog.config.ts'),
      `import { defineConfig } from '@elog/cli';
import { getDocDetailList } from '@elog/plugin-sdk';
import markdownToHtml from '@elog/plugin-transform-markdown-to-html';
import toHalo from '@elog/plugin-to-halo';

export default defineConfig({
  from: {
    name: 'from:fixture',
    kind: 'from',
    download(ctx) {
      const version = Number(process.env.HALO_FIXTURE_VERSION ?? 1);
      const doc = {
        id: 'halo-readback-fixture',
        title: 'Halo readback fixture',
        updateTime: version,
        body: '# Hello\\n\\n![image](${imageHost}/${imagePrefix}body.png)\\n\\nversion-' + version,
        properties: ${JSON.stringify(properties)},
      };
      return getDocDetailList({
        cachedDocList: ctx.cache.docList,
        getSortedDocList: async () => [doc],
        getDocDetail: async () => doc,
        limit: 1,
      });
    },
  },
  to: toHalo({
    endpoint: process.env.HALO_ENDPOINT,
    token: process.env.HALO_TOKEN,
    plugins: [markdownToHtml()],
  }),
});
`,
    );
  },
  async expect({ result, workspace, repoRoot }) {
    try {
      expectExitCode(result, 0);
      const credentials = { endpoint: env.HALO_ENDPOINT!, token: env.HALO_TOKEN! };
      const image = { host: imageHost, prefixKey: imagePrefix };
      const [original] = await expectHaloPosts(docs, credentials, image);
      expect(original!.head.content).toContain('<h1>Hello</h1>');
      expect(original!.head.content).toContain('version-1');
      const updatedRun = await runElog(['sync', '--config', 'elog.config.ts'], {
        cwd: workspace,
        repoRoot,
        env: { ...env, HALO_FIXTURE_VERSION: '2' },
      });
      expectExitCode(updatedRun, 0);
      const [updated] = await expectHaloPosts(docs, credentials, image);
      expect(updated!.head.snapshotName).not.toBe(original!.head.snapshotName);
      expect(updated!.head.content).toContain('version-2');
      expect(updated!.release.content).toContain('version-2');
      expect(createdCount).toBe(1);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
};

export default commandCase;
