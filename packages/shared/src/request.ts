import { HttpClientResponse, RequestOptions, request as req } from 'urllib'

/**
 * 网络请求封装
 * @param url
 * @param reqOpts
 */
export const request = async <T>(
  url: string,
  reqOpts?: RequestOptions,
): Promise<HttpClientResponse<T>> => {
  // 超时时间 60s
  const timeout = Number(process.env.REQUEST_TIMEOUT) || 60000
  const opts: RequestOptions = {
    contentType: 'json',
    dataType: 'json',
    headers: {
      'User-Agent': 'Elog',
      ...reqOpts?.headers,
    },
    compressed: true,
    timeout,
    ...reqOpts,
  }
  return req(url, opts)
}
