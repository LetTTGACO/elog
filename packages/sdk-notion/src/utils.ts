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

/**
 * 生成单层目录信息
 * @param page
 * @param property 分类字段
 */
// export function genSingleCatalog(page: NotionDoc, property: string): NotionCatalog[] | undefined {
//   // 单目录
//   const catalog = page.properties[property]
//   if (catalog) {
//     if (typeof catalog !== 'string') {
//       out.warning(
//         `${page.properties.title}文档的${property}属性应为Select（单选）类型，请检查字段是否符合规则`,
//       )
//       return undefined
//     }
//     return [
//       {
//         ...page,
//         title: catalog,
//         doc_id: page.id,
//       },
//     ]
//   }
//   return undefined
// }

/**
 * 生成多层目录信息
 */
// export function genMultiCatalog(page: NotionDoc, property: string): NotionCatalog[] | undefined {
//   try {
//     const catalogProps = Object.keys(page.properties)
//       .filter((item) => {
//         return item.includes(property)
//       })
//       .sort((a, b) => {
//         // split后取最后一个数字
//         return Number(b.split('-').pop()) - Number(a.split('-').pop())
//       })
//       .filter((item) => {
//         return !!page.properties[item]
//       })
//     if (!catalogProps.length) {
//       return undefined
//     }
//     return catalogProps.map((item) => {
//       return {
//         ...page,
//         title: page.properties[item],
//         doc_id: page.id,
//       }
//     }) as NotionCatalog[]
//   } catch (e: any) {
//     out.warning(`${page.properties.title} 文档分类信息提取失败，请检查字段是否符合规则`)
//     out.warning(e.message)
//     return undefined
//   }
// }

export function genCatalog(page: NotionDoc, property: string): DocCatalog[] | undefined {
  const catalog = page.properties[property]
  if (!catalog) {
    out.warning(`${page.properties.title} ${property} 属性缺失或没有值`)
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
