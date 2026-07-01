import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from './request';

let server: Server;
let baseUrl: string;

beforeEach(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/json') {
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          method: req.method,
          query: Object.fromEntries(url.searchParams),
          userAgent: req.headers['user-agent'],
        }),
      );
      return;
    }
    if (url.pathname === '/inspect' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', () => {
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            method: req.method,
            authorization: req.headers.authorization,
            contentType: req.headers['content-type'],
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      });
      return;
    }
    if (url.pathname === '/text') {
      res.setHeader('content-type', 'text/plain');
      res.end('hello');
      return;
    }
    if (url.pathname === '/buffer') {
      res.setHeader('content-type', 'application/octet-stream');
      res.end(Buffer.from([1, 2, 3]));
      return;
    }
    if (url.pathname === '/teapot') {
      res.statusCode = 418;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ code: 'teapot' }));
      return;
    }
    if (url.pathname === '/slow') {
      setTimeout(() => res.end('late'), 50);
      return;
    }
    res.statusCode = 404;
    res.end('missing');
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('failed to start test server');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('request', () => {
  it('sends GET data as query and keeps the default user agent', async () => {
    const res = await request<{ query: Record<string, string>; userAgent: string }>(
      `${baseUrl}/json`,
      {
        method: 'GET',
        data: { page: 1 },
      },
    );

    expect(res.status).toBe(200);
    expect(res.data.query).toEqual({ page: '1' });
    expect(res.data.userAgent).toBe('Elog');
  });

  it('returns text responses', async () => {
    const res = await request<string>(`${baseUrl}/text`, { dataType: 'text' });

    expect(res.status).toBe(200);
    expect(res.data).toBe('hello');
  });

  it('returns buffer responses', async () => {
    const res = await request<Buffer>(`${baseUrl}/buffer`, { dataType: 'buffer' });

    expect(Buffer.isBuffer(res.data)).toBe(true);
    expect([...res.data]).toEqual([1, 2, 3]);
  });

  it('does not throw for non-2xx responses', async () => {
    const res = await request<{ code: string }>(`${baseUrl}/teapot`);

    expect(res.status).toBe(418);
    expect(res.data).toEqual({ code: 'teapot' });
  });

  it('sends plain object POST data as JSON by default', async () => {
    const res = await request<{ body: string; contentType: string }>(`${baseUrl}/inspect`, {
      method: 'POST',
      data: { hello: 'world' },
    });

    expect(res.data.body).toBe(JSON.stringify({ hello: 'world' }));
    expect(res.data.contentType).toContain('application/json');
  });

  it('keeps an existing content-type header when sending JSON data', async () => {
    const res = await request<{ contentType: string }>(`${baseUrl}/inspect`, {
      method: 'POST',
      contentType: 'json',
      data: { hello: 'world' },
      headers: {
        'content-type': 'application/vnd.custom+json',
      },
    });

    expect(res.data.contentType).toBe('application/vnd.custom+json');
  });

  it('uses auth to send a basic authorization header', async () => {
    const res = await request<{ authorization: string }>(`${baseUrl}/inspect`, {
      method: 'POST',
      auth: 'user:pass',
    });

    expect(res.data.authorization).toBe(`Basic ${Buffer.from('user:pass').toString('base64')}`);
  });

  it('prefers an existing lowercase authorization header over auth', async () => {
    const res = await request<{ authorization: string }>(`${baseUrl}/inspect`, {
      method: 'POST',
      auth: 'user:pass',
      headers: {
        authorization: 'Bearer lower',
      },
    });

    expect(res.data.authorization).toBe('Bearer lower');
  });

  it('prefers an existing uppercase Authorization header over auth', async () => {
    const res = await request<{ authorization: string }>(`${baseUrl}/inspect`, {
      method: 'POST',
      auth: 'user:pass',
      headers: {
        Authorization: 'Bearer upper',
      },
    });

    expect(res.data.authorization).toBe('Bearer upper');
  });

  it('sends body when provided', async () => {
    const res = await request<{ body: string }>(`${baseUrl}/inspect`, {
      method: 'POST',
      body: 'from-body',
    });

    expect(res.data.body).toBe('from-body');
  });

  it('sends stream compatibility input when provided', async () => {
    const res = await request<{ body: string }>(`${baseUrl}/inspect`, {
      method: 'POST',
      stream: Buffer.from('from-stream'),
    });

    expect(res.data.body).toBe('from-stream');
  });

  it('sends native FormData as multipart without overriding the boundary', async () => {
    const form = new FormData();
    form.set('text', 'hello multipart');
    form.set('file', new Blob(['file-bytes-here']), 'note.txt');

    const res = await request<{ body: string; contentType: string }>(`${baseUrl}/inspect`, {
      method: 'POST',
      data: form,
    });

    expect(res.data.contentType).toContain('multipart/form-data');
    expect(res.data.body).toContain('name="text"');
    expect(res.data.body).toContain('\r\n\r\nhello multipart\r\n');
    expect(res.data.body).toContain('name="file"; filename="note.txt"');
    expect(res.data.body).toContain('Content-Type: application/octet-stream');
    expect(res.data.body).toContain('\r\n\r\nfile-bytes-here\r\n');
  });

  it('honors the request timeout', async () => {
    await expect(request(`${baseUrl}/slow`, { timeout: 1, dataType: 'text' })).rejects.toThrow();
  });
});
