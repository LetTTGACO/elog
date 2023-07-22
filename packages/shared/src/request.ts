import { HttpClientResponse, request as req, RequestOptions } from 'urllib'
import out from './out'

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
    timeout: Number(process.env?.REQUEST_TIMEOUT || 60000) || 60000,
    ...reqOpts,
  }
  out.debug(`API请求URL: ${url}，请求参数: ${JSON.stringify(opts)}`)
  return req(url, opts)
}
