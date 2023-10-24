import imgSize from 'image-size'
import { ImageUrl } from '../types'
// @ts-ignore
import { getEtag } from './qetag.js'
import { request } from '../request'
import out from '../out'
import { createHash } from 'node:crypto'

/**
 * 通过图片url获取文件type, 不含"."
 * @param url
 */
export const getFileTypeFromUrl = (url: string) => {
  const reg = /[^/]+(?!.*\/)/g
  const imgName = url
    .match(reg)
    ?.filter((item) => item)
    .pop()
  // 去除#
  let filename = ''
  let filetype = ''
  if (imgName) {
    const imgL = imgName.split('.')
    if (imgL.length > 1) {
      filename = imgName.split('.')[0]
      filetype = imgName.split('.')[1].split('?')[0].split('#')[0]
      return {
        name: filename,
        type: filetype,
      }
    } else {
      out.warning(`获取文件名失败，跳过: ${url}`)
    }
  } else {
    out.warning(`获取文件名失败，跳过: ${url}`)
  }
}

export const getFileTypeFromBuffer = (buffer: Buffer): any => {
  return imgSize(buffer).type
}

interface FileType {
  type: string
  name?: string
}

/**
 * 获取文件类型
 * @param url
 */
export const getFileType = (url: string) => {
  let file: FileType | undefined = getFileTypeFromUrl(url)
  return file
}

/**
 * 根据文件内容获取唯一文件名
 * @param imgBuffer
 */
export async function getFileName(imgBuffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    getEtag(imgBuffer, (hash: string) => {
      resolve(hash)
    })
  })
}

/**
 * 去除图片链接中多余的参数
 * @param originalUrl
 */
export const cleanParameter = (originalUrl: string) => {
  let newUrl = originalUrl
  // 去除#号
  const indexPoundSign = originalUrl.indexOf('#')
  if (indexPoundSign !== -1) {
    newUrl = originalUrl.substring(0, indexPoundSign)
  }
  // 去除?号
  const indexQuestionMark = originalUrl.indexOf('?')
  if (indexQuestionMark !== -1) {
    newUrl = originalUrl.substring(0, indexQuestionMark)
  }
  return newUrl
}

/**
 * 获取图片链接
 * @param content
 */
export const getUrlListFromContent = (content: string) => {
  const markdownURLList = (content.match(/!\[[^\]]*\]\(([^)]+)\)/g) || [])
    .map((item: string) => {
      const res = item.match(/\!\[.*\]\((.*?)( ".*")?\)/)
      if (res) {
        const url = res[1]
        // 去除#?号
        return {
          original: url,
          url: cleanParameter(url),
        }
      }
      return undefined
    })
    .filter((item) => item) as ImageUrl[]
  const imageTagURLList = (content.match(/<img.*?(?:>|\/>)/gi) || [])
    .map((item: string) => {
      const res = item.match(/src=[\'\"]?([^\'\"]*)[\'\"]?/i)
      if (res) {
        const url = res[1]
        // 去除#?号
        return {
          original: url,
          url: cleanParameter(url),
        }
      }
      return undefined
    })
    .filter((item) => item) as ImageUrl[]
  return markdownURLList.concat(imageTagURLList)
}

/**
 * 根据url生成唯一文件名
 * @param url
 */
export const generateUniqueId = (url: string) => {
  return createHash('md5').update(url).digest('hex')
}

/**
 * 获取图片buffer
 */
export const getPicBufferFromURL = async (url: string) => {
  try {
    const res = await request<Buffer>(url, {
      dataType: 'arraybuffer',
      headers: {
        // NOTE FlowUs图片下载有限制，需要referer为https://flowus.cn/
        referer: process.env.REFERER_URL,
      },
    })
    out.info('下载成功', url)
    return res.data
  } catch (e: any) {
    out.warning(`下载失败: ${url}，${e.message}`)
    out.debug(e)
  }
}
