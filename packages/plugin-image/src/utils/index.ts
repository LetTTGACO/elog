// @ts-ignore
import { getEtag } from './qetag.js'
import { getFileType, getFileTypeFromBuffer, getFileTypeFromUrl } from './url'

/**
 * 去除图片链接中多余的参数
 * @param originalUrl
 */
const cleanParameter = (originalUrl: string) => {
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
  const markdownURLList = (content.match(/\!\[.*\]\(.*\)/g) || [])
    .map((item: string) => {
      const res = item.match(/\!\[.*\]\((.*?)( ".*")?\)/)
      if (res) {
        const url = res[1]
        // 去除#?号
        return cleanParameter(url)
      }
      return null
    })
    .filter((item) => item) as string[]
  const imageTagURLList = (content.match(/<img.*?(?:>|\/>)/gi) || [])
    .map((item: string) => {
      const res = item.match(/src=[\'\"]?([^\'\"]*)[\'\"]?/i)
      if (res) {
        const url = res[1]
        // 去除#?号
        return cleanParameter(url)
      }
      return null
    })
    .filter((item) => item) as string[]
  return markdownURLList.concat(imageTagURLList)
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

export { getFileTypeFromUrl, getFileTypeFromBuffer, getFileType }
