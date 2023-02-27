import frontMatter from 'front-matter'
import moment from 'moment'
import { DocInfo, Properties } from './types'

/**
 * 生成元数据
 */
export const getProps = (page: DocInfo) => {
  let { body } = page
  try {
    // front matter信息的<br/>换成 \n
    const regex = /^---[\s|\S]+?---/i
    body = body.replace(regex, (a) => a.replace(/(<br \/>|<br>|<br\/>)/gi, '\n'))
    const result = frontMatter(body)
    // 删除frontMatter
    body = body.replace(regex, '')
    let properties = result.attributes as Properties
    // 注入title 和urlname
    properties.title = page.title
    // urlname
    properties.urlname = page.doc_id
    // 作者
    properties.author = page.book.user.name
    // 创建时间
    properties.date = formatDate(page.created_at)
    // 更新时间
    properties.updated = formatDate(page.updated_at)
    return {
      body,
      properties,
    }
  } catch (e) {
    return {
      body,
      properties: {},
    }
  }
}

/**
 * 格式化日期
 * @param date
 */
export function formatDate(date: Date) {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}
