import { WoLaiDatabaseTableProperty, WoLaiTableRow } from './types'
import { DocProperties, DocCatalog, DocDetail } from '@elog/types'
import { timeFormat, out } from '@elog/shared'

/**
 * 获取元数据Val
 * @param data
 * @param tableFields
 */
export function getPropVal(
  data: WoLaiTableRow['properties'],
  tableFields: WoLaiDatabaseTableProperty[],
) {
  const properties: any = {}
  tableFields.forEach((field) => {
    if (data[field.id]) {
      switch (field.type) {
        case 'primary':
          properties.title = data[field.id][0][0]
          break
        case 'date':
          // 只取开始时间
          properties[field.name] = data[field.id][0][1][0][2].start_date
          break
        case 'multi_select':
          // 取数组
          const ids = data[field.id][0][1][0][1]
          properties[field.name] = field.options.map((opt) => {
            return ids.includes(opt.option_id) ? opt.value : ''
          })
          break
        case 'checkbox':
          // 取 boolean
          properties[field.name] = data[field.id][0][0] === 'True'
          break
        case 'file':
          // TODO 处理文件
          break
        case 'select':
        case 'text':
        case 'number':
        case 'url':
        case 'people':
        case 'email':
        case 'phone':
          properties[field.name] = String(data[field.id][0][0])
          break
        default:
          break
      }
    }
  })
  return properties

  // let val = data[data.type]
  // if (!val) return ''
  // switch (data.type) {
  //   case 'multi_select':
  //     return val.map((a: any) => a.name)
  //   case 'select':
  //     return val.name
  //   case 'date':
  //     return timeFormat(val.start)
  //   case 'rich_text':
  //   case 'title':
  //     return val.map((a: any) => a.plain_text).join('')
  //   case 'text':
  //     return data.plain_text
  //   case 'files':
  //     if (val.length < 1) return ''
  //     return val[0][val[0].type].url
  //   default:
  //     return val
  // }
}

/**
 * 生成元数据
 * @param {*} page
 * @param tableFields
 * @returns {Object}
 */
export function props(
  page: WoLaiTableRow,
  tableFields: WoLaiDatabaseTableProperty[],
): DocProperties {
  let properties: any = {}
  if (!Object.keys(page.properties).length) return properties
  // const titleField = tableFields.find((item) => item.type === 'primary')!.id
  properties = getPropVal(page.properties, tableFields)
  // if (!properties.cover && page.cover) {
  //   const type = page.cover.type
  //   if (type) {
  //     properties.cover = (page.cover as any)[type].url
  //   }
  // }
  // 单独处理title
  // if (!properties.title) {
  //   properties.title = page.properties[titleField][0][0]
  // }
  // 单独处理urlname
  if (!properties.urlname) {
    properties.urlname = page.block_id
  }
  // date
  if (!properties.date) {
    properties.date = timeFormat(page.created_time)
  }
  if (!properties.updated) {
    properties.updated = timeFormat(page.edited_time)
  }
  return properties
}

export function genCatalog(doc: DocDetail, property: string): DocCatalog[] | undefined {
  const catalog = doc.properties[property]
  if (!catalog) {
    out.warning(`${doc.properties.title} ${property} 属性缺失`)
    return undefined
  } else if (typeof catalog === 'string') {
    // 单选
    return [
      {
        title: catalog,
        doc_id: doc.doc_id,
      },
    ]
  } else if (Array.isArray(catalog)) {
    // 多选
    return catalog.map((item) => {
      return {
        title: item,
        doc_id: doc.doc_id,
      }
    })
  } else {
    // 没有值
    out.warning(`${doc.properties.title} 文档分类信息提取失败，${property} 字段只能是单选/多选`)
    return undefined
  }
}
