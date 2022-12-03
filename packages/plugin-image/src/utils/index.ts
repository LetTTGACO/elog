// @ts-ignore
import { getEtag } from './qetag.js'
import { getFileTypeFromBuffer, getFileTypeFromUrl, getFileType } from './url'

/**
 * 获取图片链接
 * @param content
 */
export const getUrlListFromContent = (content: string) => {
  const markdownURLList = (content.match(/\!\[.*\]\(.*\)/g) || [])
    .map((item: string) => {
      const res = item.match(/\!\[.*\]\((.*?)( ".*")?\)/)
      if (res) {
        return res[1]
      }
      return null
    })
    .filter((item) => item) as string[]
  const imageTagURLList = (content.match(/<img.*?(?:>|\/>)/gi) || [])
    .map((item: string) => {
      const res = item.match(/src=[\'\"]?([^\'\"]*)[\'\"]?/i)
      if (res) {
        return res[1]
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
