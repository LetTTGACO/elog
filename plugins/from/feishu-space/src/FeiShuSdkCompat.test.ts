import { FeiShuClient } from '@feishux/api';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const json = (body: unknown) => JSON.stringify(body);

describe('FeiShu SDK request compatibility', () => {
  let server: Server;
  let baseUrl: string;
  let requests: string[];

  beforeEach(async () => {
    requests = [];
    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      requests.push(`${req.method} ${url.pathname}`);
      res.setHeader('content-type', 'application/json');

      if (
        req.method === 'POST' &&
        url.pathname === '/open-apis/auth/v3/tenant_access_token/internal'
      ) {
        res.end(json({ code: 0, tenant_access_token: 'tenant-token' }));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/open-apis/drive/v1/files') {
        expect(req.headers.authorization).toBe('Bearer tenant-token');
        expect(url.searchParams.get('folder_token')).toBe('folder-token');
        res.end(
          json({
            code: 0,
            data: {
              has_more: false,
              files: [
                {
                  type: 'docx',
                  token: 'doc-token',
                  name: 'Smoke Doc',
                  created_time: '1',
                  modified_time: '2',
                },
              ],
            },
          }),
        );
        return;
      }

      res.statusCode = 404;
      res.end(json({ code: 404, msg: 'unexpected request' }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/open-apis`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('can fetch through @feishux/api against a local Feishu-compatible server', async () => {
    const client = new FeiShuClient({
      appId: 'app-id',
      appSecret: 'app-secret',
      baseUrl,
    });

    await expect(client.getFolderTree('folder-token')).resolves.toEqual([
      {
        type: 'docx',
        token: 'doc-token',
        name: 'Smoke Doc',
        created_time: '1',
        modified_time: '2',
      },
    ]);
    expect(requests).toEqual([
      'POST /open-apis/auth/v3/tenant_access_token/internal',
      'GET /open-apis/drive/v1/files',
    ]);
  });
});
