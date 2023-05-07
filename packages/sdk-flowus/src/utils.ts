import { out } from '@elog/shared'
import { DocCatalog, DocProperties } from '@elog/types'
import { Blocks } from '@flowusx/flowus-types'
import * as moment from 'moment'

export function formatDate(date: Date | string | number) {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 获取元数据Val
 * @param type
 * @param val
 */
export function getPropVal(type: string, val: any) {
  if (!val) return ''
  switch (type) {
    case 'text':
    case 'email':
    case 'url':
    case 'select':
    case 'number':
    case 'phone':
      return val.text
    case 'file':
      // 暂不支持
      out.warning(
        '暂不支持【文件媒体】类型的属性, 请将文件上传到图床后使用【文本/网址链接】类型的属性',
      )
      return ''
    case 'checkbox':
      return !!val.text
    case 'formula':
      out.warning('暂不支持【公式】类型的属性')
      return ''
    // case 'created_at':
    //   // 创建时间直接在外面取值
    //   return ''
    // case 'updated_at':
    //   // 更新时间直接在外面取值
    //   return ''
    case 'date':
      return formatDate(val.startDate + ' ' + val.startTime)
    case 'multi_select':
      return val.text.split(',')
    case 'person':
      out.warning('暂不支持【人员】类型的属性')
      return ''
    default:
      return val.text || ''
  }
}

/**
 * 生成元数据
 * @returns {Object}
 * @param blocks
 */
export function props(blocks: Blocks): DocProperties {
  // 获取properties
  let properties: any = {}
  const pageInfo = blocks[Object.keys(blocks)[0]]
  const tableBlock = blocks[pageInfo.parentId]
  const pageProperties = pageInfo.data.collectionProperties
  if (!pageProperties) return properties
  const propIds = Object.keys(pageProperties)
  if (!propIds.length) return properties
  propIds.forEach((propId) => {
    const propConfig = tableBlock.data.schema[propId]
    const propName = propConfig.name
    const propType = propConfig.type
    // 判断类型，进行不同类型的取值
    properties[propName] = pageProperties[propId]
      .map((value) => {
        return getPropVal(propType, value) as string
      })
      .join(',')
    properties.urlname = pageInfo.uuid
    if (!properties.date) {
      properties.date = formatDate(pageInfo.createdAt)
    }
    if (!properties.updated) {
      properties.updated = formatDate(pageInfo.updatedAt)
    }
    properties.title = pageInfo.title
  })
  return properties
}

export function genCatalog(
  page: { id: string; properties: DocProperties },
  property: string,
): DocCatalog[] | undefined {
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
    out.warning(`${page.properties.title} 文档分类信息提取失败，${property} 字段只能是单选/多选`)
    return undefined
  }
}
