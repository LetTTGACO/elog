import { NotionPage } from './types'
import moment from 'moment'
import { DocProperties } from '@elog/types'

/**
 * 获取元数据Val
 * @param data
 */
export function getPropVal(data: any) {
  let val = data[data.type]
  if (!val) return ''
  switch (data.type) {
    case 'multi_select':
      return val.map((a: any) => a.name)
    case 'select':
      return val.name
    case 'date':
      return val.start
    case 'rich_text':
    case 'title':
      return val.map((a: any) => a.plain_text).join('')
    case 'text':
      return data.plain_text
    case 'files':
      if (val.length < 1) return ''
      return val[0][val[0].type].url
    default:
      return val
  }
}

/**
 * 生成元数据
 * @param {*} page
 * @returns {Object}
 */
export function props(page: NotionPage): DocProperties {
  let data: any = {}
  if (!Object.keys(page.properties).length) return data
  for (const key in page.properties) {
    data[key] = getPropVal(page.properties[key])
  }
  // 单独处理urlname
  if (!data.urlname) {
    data.urlname = page.id
  }
  // date
  if (!data.date) {
    data.date = formatDate(page.created_time)
  }
  if (!data.updated) {
    data.updated = formatDate(page.last_edited_time)
  }
  return data
}

/**
 * 格式化日期
 * @param date
 */
export function formatDate(date: Date | string) {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}
