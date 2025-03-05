import req, { AxiosRequestConfig, AxiosResponse } from 'axios'

import out from './out'

/**
 * 网络请求封装
 * @param url
 * @param reqOpts
 */
export const requestAxios = async <T>(
  url: string,
  reqOpts?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  const opts: AxiosRequestConfig = {
    headers: {
      'User-Agent': 'Elog',
      ...reqOpts?.headers,
    },
    // 超时时间 60s
    timeout: Number(process.env?.REQUEST_TIMEOUT || 60000) || 60000,
    ...reqOpts,
  }
  out.debug(`API请求URL: ${url}`)
  if (url.includes('api.github.com')) {
    // Github Base64 输出太多，只输出headers
    out.debug(`API请求Header参数: ${JSON.stringify(reqOpts?.headers || {})}`)
  } else {
    out.debug(`API请求参数: ${JSON.stringify(opts)}`)
  }
  return req(url, opts)
}
