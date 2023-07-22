import { DocDetail } from '@elog/types'
import { out, request } from '@elog/shared'
// @ts-ignore
import { getEtag } from './qetag.js'
interface NoRepValues {
  tags: string[]
  categories: string[]
}

export function getNoRepValues(
  posts: DocDetail[],
  tagKey: string,
  categoryKey: string,
): NoRepValues {
  const values = posts.reduce(
    (acc: NoRepValues, cur) => {
      const tag = cur.properties[tagKey] as string | string[]
      const category = cur.properties[categoryKey] as string | string[]
      if (typeof tag === 'string') {
        acc.tags.push(tag)
      } else if (Array.isArray(tag)) {
        acc.tags = acc.tags.concat(tag)
      }
      if (typeof category === 'string') {
        acc.categories.push(category)
      } else if (Array.isArray(category)) {
        acc.categories = acc.categories.concat(category)
      }
      return acc
    },
    { tags: [], categories: [] },
  )
  // 去重
  return {
    tags: Array.from(new Set(values.tags)),
    categories: Array.from(new Set(values.categories)),
  }
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

interface AnyObject {
  [key: string]: any
}

/**
 * 删除对象中的空属性
 * @param obj
 */
export const removeEmptyProperties = (obj: AnyObject): AnyObject => {
  const filteredObj: AnyObject = {}

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '' && value.length !== 0) {
      filteredObj[key] = value
    }
  })

  return filteredObj
}

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
    filename = imgName.split('.')[0]
    filetype = imgName.split('.')[1].split('?')[0].split('#')[0]
    return {
      name: filename,
      type: filetype,
    }
  } else {
    out.warning(`获取文件名失败: ${url}，跳过上传，请检查`)
  }
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
