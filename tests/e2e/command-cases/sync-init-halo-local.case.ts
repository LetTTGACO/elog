import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { expect } from 'vitest';
import { generateInitFiles } from '../../../packages/cli/src/commands/init/generator';
import { loadBuiltInPluginRegistry } from '../../../packages/cli/src/commands/init/registry';
import { expectExitCode } from '../src/helpers/assertions';
import { copyIntoWorkspace } from '../src/helpers/temp-workspace';
import type { CommandCase } from '../src/helpers/types';

let server: http.Server;
const posts: Array<{ content: { content: string; raw: string; rawType: string } }> = [];
const env: NodeJS.ProcessEnv = {};

const commandCase: CommandCase = {
  id: 'sync-init-halo-local',
  command: ['sync', '--config', 'elog.config.ts'],
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
    env.HALO_ENDPOINT = `http://127.0.0.1:${address.port}`;
    env.HALO_TOKEN = 'fixture-token';

    copyIntoWorkspace(path.join(repoRoot, 'tests/fixtures/basic-config'), workspace, [
      'plugins.ts',
    ]);
    fs.writeFileSync(
      path.join(workspace, 'from-fixture.ts'),
      "import { fromFixture } from './plugins';\nexport default function () { return fromFixture; }\n",
    );
    const registry = loadBuiltInPluginRegistry();
    const files = generateInitFiles({
      from: {
        kind: 'from',
        type: 'fixture',
        displayName: 'Fixture',
        packageName: './from-fixture.ts',
        importName: 'fromFixture',
        optionsSchema: { type: 'object' },
      },
      transforms: [],
      to: ['halo', 'local'].map((type) =>
        registry.plugins.find((entry) => entry.kind === 'to' && entry.type === type)!,
      ),
    });
    fs.writeFileSync(path.join(workspace, 'elog.config.ts'), files.configText);
  },
  async expect({ result, workspace }) {
    try {
      expectExitCode(result, 0);
      expect(posts).toHaveLength(1);
      expect(posts[0].content).toEqual({
        content: '<p>fixture</p>\n',
        raw: 'fixture',
        rawType: 'markdown',
      });
      expect(fs.readFileSync(path.join(workspace, 'docs/Fixture Doc.md'), 'utf8')).toBe('fixture');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
};

export default commandCase;
