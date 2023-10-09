import { out } from '@elog/shared'
import moment from 'moment'
import { FeiShuDoc } from './types'
import frontMatter from 'front-matter'

/**
 * 格式化时间
 * @param date
 */
export function formatDate(date: Date | number) {
  return moment(Number(date)).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 生成元数据
 */
export const getProps = (page: FeiShuDoc, body: string) => {
  let properties = {
    // 注入title
    title: page.title,
    // urlname
    urlname: page.doc_id,
    // 创建时间
    date: formatDate(page.createdAt),
    // 更新时间
    updated: formatDate(page.updatedAt),
  } as any
  try {
    const regex = /^---[\s|\S]+?---/i
    body = body.replace(regex, (a: string) => a.replace(/(<br \/>|<br>|<br\/>)/gi, '\n'))
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
