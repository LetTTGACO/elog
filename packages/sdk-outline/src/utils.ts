import frontMatter from 'front-matter'
import { DocUnite, GetProps } from './types'
import { out, timeFormat } from '@elog/shared'

/**
 * 生成元数据
 */
export const getProps = (page: DocUnite): GetProps => {
  let { text: body } = page
  let properties = {
    // 注入title
    title: page.title,
    // urlname
    urlname: page.urlId,
    // 创建时间
    date: timeFormat(page.createdAt),
    // 更新时间
    updated: timeFormat(page.updatedAt),
  } as any

  try {
    const result = frontMatter(body)
    body = result.body
    let attributes = <Record<string, string>>result.attributes
    properties = {
      ...properties,
      ...attributes,
    }
    return {
      body,
      properties,
    }
  } catch (e: any) {
    out.warning('front-matter解析失败，将返回预定义属性', e.message)
    out.warning('预定义属性：https://elog.1874.cool/notion/raqyleng501h23p1#预定义属性')
    out.debug(e)
    return {
      body,
      properties,
    }
  }
}
