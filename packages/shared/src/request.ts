import { HttpClientResponse, request as req, RequestOptions } from 'urllib'

/**
 * 网络请求封装
 * @param url
 * @param reqOpts
 */
export const request = async <T>(
  url: string,
  reqOpts?: RequestOptions,
): Promise<HttpClientResponse<T>> => {
  const opts: RequestOptions = {
    contentType: 'json',
    dataType: 'json',
    headers: {
      'User-Agent': 'Elog',
      ...reqOpts?.headers,
    },
    gzip: true,
    // proxy
    rejectUnauthorized: !process.env.http_proxy,
    enableProxy: !!process.env.http_proxy,
    proxy: process.env.http_proxy,
    // 超时时间 60s
    timeout: 60000,
    ...reqOpts,
  }
  return req(url, opts)
}
