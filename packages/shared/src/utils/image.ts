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
 * @param needError
 */
export const getFileTypeFromUrl = (url: string, needError = true) => {
  const reg = /[^/]+(?!.*\/)/g
  const imgName = url
    .match(reg)
    ?.filter((item) => item)
    .pop()
  // 去除#
  let filename = ''
  let filetype = ''
  if (imgName) {
    const imgL = imgName.split('?')[0].split('#')[0].split('.')
    if (imgL.length > 1) {
      filename = imgL.slice(0, -1).join('.')
      filetype = imgL[imgL.length - 1].split('?')[0].split('#')[0]
      return {
        name: filename,
        type: filetype,
      }
    } else {
      needError && out.warning(`获取文件名失败，跳过: ${url}`)
    }
  } else {
    needError && out.warning(`获取文件名失败，跳过: ${url}`)
  }
}

export const getFileTypeFromBuffer = (buffer: Buffer): FileType | undefined => {
  const fileType = imgSize(buffer).type
  if (fileType) {
    return {
      type: fileType,
    }
  }
}

interface FileType {
  type: string
  name?: string
}

/**
 * 获取文件类型
 * @param url
 */
export const getFileType = async (url: string) => {
  let fileType: FileType | undefined = getFileTypeFromUrl(url, false)
  if (!fileType) {
    // 尝试从 buffer 中获取
    const buffer = await getPicBufferFromURL(url)
    if (buffer) {
      fileType = getFileTypeFromBuffer(buffer)
      return fileType
    }
  }
  return fileType
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
 * 从 md 文档获取图片链接列表
 * @param content
 * @param clean
 */
export const getUrlListFromContent = (content: string, clean = true) => {
  const markdownURLList = (content.match(/!\[[^\]]*\]\(([^)]+)\)/g) || [])
    .map((item: string) => {
      const res = item.match(/\!\[.*\]\((.*?)( ".*")?\)/)
      if (res) {
        const url = res[1]
        // 过滤 Base64 图片
        if (url.startsWith('data:')) return undefined
        // 去除#?号
        return {
          original: url,
          url: clean ? cleanParameter(url) : url,
        }
      }
      return undefined
    })
    .filter((item) => item) as ImageUrl[]
  // const imageTagURLList = (content.match(/<img.*?(?:>|\/>)/gi) || [])
  //   .map((item: string) => {
  //     const res = item.match(/src=[\'\"]?([^\'\"]*)[\'\"]?/i)
  //     if (res) {
  //       const url = res[1]
  //       // 过滤 Base64 图片
  //       if (url.startsWith('data:')) return undefined
  //       // 去除#?号
  //       return {
  //         original: url,
  //         url: cleanParameter(url),
  //       }
  //     }
  //     return undefined
  //   })
  //   .filter((item) => item) as ImageUrl[]
  // return markdownURLList.concat(imageTagURLList)
  return markdownURLList
}

/**
 * 从 URL 链接获取干净的 url
 * @param url
 */
export const getUrl = (url: string) => {
  return {
    original: url,
    url: cleanParameter(url),
  }
}

/**
 * 根据url生成唯一文件名
 * @param url
 * @param length 长度截取
 */
export const generateUniqueId = (url: string, length?: number) => {
  const hash = createHash('md5').update(url).digest('hex')
  if (length) {
    return hash.substring(0, length)
  }
  return hash
}

/**
 * 获取图片buffer
 */
export const getPicBufferFromURL = async (url: string) => {
  try {
    let referer = ''
    if (url.includes('cdn.flowus.cn') || url.includes('flowus.net.cn')) {
      referer = 'https://flowus.cn/'
    }
    const res = await request<Buffer>(url, {
      dataType: 'arraybuffer',
      headers: {
        referer,
      },
    })
    out.info('下载成功', url)
    return res.data
  } catch (e: any) {
    out.warning(`下载失败: ${url}，${e.message}`)
    out.debug(e)
  }
}
