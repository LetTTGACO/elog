import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect } from 'vitest';
import { expectExitCode } from '../src/helpers/assertions';
import type { CommandCase } from '../src/helpers/types';

let server: http.Server;
const posts: Array<{ content: { content: string; raw: string; rawType: string } }> = [];
const env: NodeJS.ProcessEnv = {};
const originalCache = JSON.stringify({ cachedDocList: [{ id: 'old-cache-entry' }] });

const commandCase: CommandCase = {
  id: 'export-halo',
  command: ['export'],
  env,
  async setup({ workspace, repoRoot }) {
    server = http.createServer(async (request, response) => {
      let body = '';
      for await (const chunk of request) body += chunk;
      if (
        request.method === 'POST' &&
        request.url === '/apis/api.console.halo.run/v1alpha1/posts'
      ) {
        posts.push(JSON.parse(body));
      }
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(request.method === 'GET' ? { items: [] } : {}));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    server.unref();
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing mock Halo address');
    const endpoint = `http://127.0.0.1:${address.port}`;

    // 替换交互、安装和来源数据，正文转换及 Halo 部署走真实 CLI 与插件。
    const inquirerPath = createRequire(path.join(repoRoot, 'packages/cli/package.json')).resolve(
      'inquirer',
    );
    const preloadPath = path.join(workspace, 'answers.mjs');
    fs.writeFileSync(
      preloadPath,
      `import inquirer from ${JSON.stringify(pathToFileURL(inquirerPath).href)};
inquirer.prompt = async (questions) => {
  if (questions.some((q) => q.name === 'from')) return { from: 'notion' };
  if (questions.some((q) => q.name === 'to')) return { to: 'halo' };
  if (questions.some((q) => q.name === 'transforms')) return { transforms: 'image-local' };
  if (questions.some((q) => q.name === 'endpoint')) return { endpoint: ${JSON.stringify(endpoint)}, token: 'fixture-token' };
  if (questions.some((q) => q.name === 'outputDir')) return { outputDir: './images' };
  return { token: 'fixture-token' };
};
`,
    );
    env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --import=${pathToFileURL(preloadPath).href}`;

    const binDir = path.join(workspace, 'bin');
    fs.mkdirSync(binDir);
    fs.writeFileSync(
      path.join(binDir, 'npm'),
      '#!/bin/sh\nprintf \'%s\\n\' "$@" > installed-packages.txt\n',
      {
        mode: 0o755,
      },
    );
    env.PATH = `${binDir}${path.delimiter}${process.env.PATH}`;
    fs.writeFileSync(path.join(workspace, 'package.json'), '{"packageManager":"npm@11"}');
    fs.writeFileSync(path.join(workspace, 'elog.cache.json'), originalCache);

    const sourceDir = path.join(workspace, 'node_modules/@elog/plugin-from-notion');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(
      path.join(sourceDir, 'package.json'),
      '{"name":"@elog/plugin-from-notion","type":"module","main":"index.js"}',
    );
    fs.writeFileSync(
      path.join(sourceDir, 'index.js'),
      `export default function () {
  return {
    name: 'from:fixture', kind: 'from',
    async download(ctx) {
      if (ctx.cache.docList.length) throw new Error('Export loaded existing cache');
      return {
        docDetailList: [{ id: 'fixture', title: 'Hello', updateTime: 1, body: '# Hello', bodyType: 'markdown', properties: { title: 'Hello', urlname: 'hello' } }],
        sortedDocList: [{ id: 'fixture', updateTime: 1 }],
        docStatusMap: { fixture: { _updateIndex: -1, _status: 1 } },
      };
    },
  };
}
`,
    );
  },
  async expect({ result, workspace }) {
    try {
      expectExitCode(result, 0);
      const packages = fs
        .readFileSync(path.join(workspace, 'installed-packages.txt'), 'utf8')
        .trim()
        .split('\n');
      expect(packages[0]).toBe('install');
      expect(
        packages.filter((name) => name === '@elog/plugin-transform-markdown-to-html'),
      ).toHaveLength(1);
      expect(packages).toContain('@elog/plugin-transform-image-local');
      expect(posts).toHaveLength(1);
      expect(posts[0].content).toEqual({
        content: '<h1>Hello</h1>\n',
        raw: '# Hello',
        rawType: 'markdown',
      });
      expect(fs.readFileSync(path.join(workspace, 'elog.cache.json'), 'utf8')).toBe(originalCache);
      expect(fs.existsSync(path.join(workspace, 'elog.config.ts'))).toBe(false);
      expect(fs.existsSync(path.join(workspace, '.env'))).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
};

export default commandCase;
