import { ofetch, type FetchOptions, type SearchParameters } from 'ofetch';
import out from '../logging/logger';

type RequestResponseType = 'json' | 'text' | 'arrayBuffer';
type RequestBody = FetchOptions<RequestResponseType>['body'];
type RequestData = RequestBody | SearchParameters;

export interface HttpClientResponse<T> {
  status: number;
  headers: Record<string, string | string[]>;
  data: T;
}

export interface RequestOptions {
  method?: string;
  data?: RequestData;
  auth?: string;
  headers?: Record<string, string>;
  dataType?: 'json' | 'text' | 'buffer';
  contentType?: 'json';
  timeout?: number;
  stream?: RequestBody;
  body?: RequestBody;
}

function hasHeader(headers: Record<string, string>, name: string) {
  const target = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeHeaders(headers: Headers) {
  const normalized: Record<string, string | string[]> = Object.fromEntries(headers.entries());
  const setCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();
  if (setCookie?.length) {
    normalized['set-cookie'] = setCookie;
  }
  return normalized;
}

/**
 * 网络请求封装，集中设置 Elog 的默认请求头、JSON 行为和超时约束。
 */
export default async <T>(
  url: string,
  reqOpts: RequestOptions = {},
): Promise<HttpClientResponse<T>> => {
  const method = (reqOpts.method || 'GET').toUpperCase();
  const isGetLike = method === 'GET' || method === 'HEAD';
  const dataType = reqOpts.dataType || 'json';
  const responseType: RequestResponseType = dataType === 'buffer' ? 'arrayBuffer' : dataType;
  const timeout = Number(reqOpts.timeout || process.env?.REQUEST_TIMEOUT || 60000) || 60000;
  const headers: Record<string, string> = {
    'User-Agent': 'Elog',
    ...reqOpts.headers,
  };
  const shouldSendJsonBody =
    !isGetLike &&
    reqOpts.body === undefined &&
    reqOpts.stream === undefined &&
    (reqOpts.contentType ?? 'json') === 'json' &&
    isPlainObject(reqOpts.data);

  if (reqOpts.auth && !hasHeader(headers, 'authorization')) {
    headers.Authorization = `Basic ${Buffer.from(reqOpts.auth).toString('base64')}`;
  }

  if (shouldSendJsonBody && !hasHeader(headers, 'content-type')) {
    headers['content-type'] = 'application/json';
  }

  const query = isGetLike ? (reqOpts.data as SearchParameters | undefined) : undefined;
  const body: RequestBody =
    reqOpts.body ??
    reqOpts.stream ??
    (shouldSendJsonBody ? JSON.stringify(reqOpts.data) : isGetLike ? undefined : reqOpts.data);

  const opts = {
    method,
    query,
    body,
    headers,
    responseType,
    timeout,
    retry: 0,
    ignoreResponseError: true,
    duplex: body ? 'half' : undefined,
  } as const;

  out.debug(`API请求URL: ${url}`);
  if (url.includes('api.github.com')) {
    out.debug(`API请求Header参数: ${JSON.stringify(reqOpts.headers || {})}`);
  } else {
    out.debug(`API请求参数: ${JSON.stringify({ ...opts, body: body ? '[body]' : undefined })}`);
  }

  const res = await ofetch.raw(url, opts);
  const data =
    dataType === 'buffer' && res._data instanceof ArrayBuffer ? Buffer.from(res._data) : res._data;

  return {
    status: res.status,
    headers: normalizeHeaders(res.headers),
    data: data as T,
  };
};
