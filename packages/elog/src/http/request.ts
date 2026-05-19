import { HttpClientResponse, request as req, RequestOptions } from 'urllib';
import out from '../logging/logger';

/**
 * 网络请求封装，集中设置 Elog 的默认请求头、JSON 行为和超时约束。
 * @param url
 * @param reqOpts
 */
export default async <T>(url: string, reqOpts?: RequestOptions): Promise<HttpClientResponse<T>> => {
  const opts: RequestOptions = {
    contentType: 'json',
    dataType: 'json',
    headers: {
      'User-Agent': 'Elog',
      ...reqOpts?.headers,
    },
    gzip: true,
    // 超时时间 60s
    timeout: Number(process.env?.REQUEST_TIMEOUT || 60000) || 60000,
    ...reqOpts,
  };
  out.debug(`API请求URL: ${url}`);
  if (url.includes('api.github.com')) {
    // GitHub Base64 响应和请求体常很大，只输出 headers 避免 debug 日志刷屏。
    out.debug(`API请求Header参数: ${JSON.stringify(reqOpts?.headers || {})}`);
  } else {
    out.debug(`API请求参数: ${JSON.stringify(opts)}`);
  }
  return req(url, opts);
};
