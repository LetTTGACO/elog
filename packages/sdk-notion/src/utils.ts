import { NotionDoc } from './types'
import moment from 'moment'
import { DocProperties, DocCatalog } from '@elog/types'
import { out } from '@elog/shared'

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
export function props(page: NotionDoc): DocProperties {
  let data: any = {}
  if (!Object.keys(page.properties).length) return data
  let titleKey = ''
  for (const key in page.properties) {
    if (page.properties[key]?.type === 'title') {
      titleKey = key
    }
    data[key] = getPropVal(page.properties[key])
  }
  if (!data.cover && page.cover) {
    const type = page.cover.type
    if (type) {
      // @ts-ignore
      data.cover = page.cover[type].url
    }
  }
  // 单独处理title
  if (!data.title) {
    const titleVal = page.properties[titleKey].title
    data.title = titleVal.map((a: any) => a.plain_text).join('')
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

export function genCatalog(page: NotionDoc, property: string): DocCatalog[] | undefined {
  const catalog = page.properties[property]
  if (!catalog) {
    out.warning(`${page.properties.title} ${property} 属性缺失`)
    return undefined
  } else if (typeof catalog === 'string') {
    // 单选
    return [
      {
        title: catalog,
        doc_id: page.id,
      },
    ]
  } else if (Array.isArray(catalog)) {
    // 多选
    return catalog.map((item) => {
      return {
        title: item,
        doc_id: page.id,
      }
    })
  } else {
    // 没有值
    out.warning(
      `${page.properties.title} 文档分类信息提取失败，${property} 字段只能是（Select）单选/（Multi-select）多选`,
    )
    return undefined
  }
}
