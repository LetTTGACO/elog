import { out } from '@elog/shared'
import { DocCatalog, DocProperties } from '@elog/types'
import { Block } from '@flowusx/flowus-types'
import moment from 'moment'
import { FlowUsDoc, FlowUsFilterItem, FlowUsSortItem } from './types'
import { FlowUsSortDirectionEnum } from './const'

/**
 * 格式化时间
 * @param date
 */
export function formatDate(date: Date | string | number) {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 获取元数据Val
 * @param type
 * @param val
 * @param pageTitle
 */
export function getPropVal(type: string, val: any, pageTitle: string) {
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
      out.debug(`【${pageTitle}】存在暂不支持的属性类型:【文件媒体】, 建议将其上传到图床后使用`)
      return ''
    // return val.url
    case 'checkbox':
      return val.text === 'YES'
    case 'formula':
      out.debug(`【${pageTitle}】存在暂不支持的属性类型:【公式】`)
      return ''
    // case 'created_at':
    //   // 创建时间直接在外面取值
    //   return ''
    // case 'updated_at':
    //   // 更新时间直接在外面取值
    //   return ''
    case 'date':
      return val.startDate.replace('/', '-') + ' ' + val.startTime
    case 'multi_select':
      return val.text.split(',')
    case 'person':
      out.debug(`【${pageTitle}】存在暂不支持的属性类型:【人员】`)
      // return val.uuid
      return ''
    default:
      return val.text || ''
  }
}

/**
 * 判断是否是多维数组
 * @param arr
 */
const isMultiArray = (arr: any[]) => {
  if (Array.isArray(arr)) {
    // 判断是否是数组
    for (let i = 0; i < arr.length; i++) {
      if (Array.isArray(arr[i])) {
        // 判断数组元素是否也是数组
        return true // 是多维数组，返回true
      }
    }
  }
  return false // 不是多维数组，返回false
}

/**
 * 生成元数据
 * @returns {Object}
 * @param pageBlock
 * @param tableBlock
 */
export function props(pageBlock: Block, tableBlock: Block): DocProperties {
  // 获取properties
  let properties: any = {}
  properties.urlname = pageBlock.uuid
  properties.title = pageBlock.title
  properties.updated = formatDate(pageBlock.updatedAt)
  properties.date = formatDate(pageBlock.createdAt)
  const pageProperties = pageBlock.data.collectionProperties
  if (!pageProperties) return properties
  const propIds = Object.keys(pageProperties)
  if (!propIds.length) return properties
  propIds.forEach((propId) => {
    const propConfig = tableBlock.data.schema[propId]
    if (!propConfig) return
    const propName = propConfig.name
    const propType = propConfig.type
    // 判断类型，进行不同类型的取值
    const propValList = pageProperties[propId].map((value) => {
      return getPropVal(propType, value, pageBlock.title) as string | string[]
    })
    if (!propValList.length) return
    // 判断propValList是否是多维数组
    const isMulti = isMultiArray(propValList)
    let propVal: string | string[]
    // 如果propValList是多维数组，则join('')
    if (!isMulti) {
      propVal = propValList.join('')
    } else {
      // 如果propValList是二维数组，则flat()
      propVal = propValList.flat().filter(Boolean)
    }
    if (!propVal?.length) return
    properties[propName] = propVal
  })
  return properties
}

/**
 * 获取目录信息
 * @param page
 * @param property
 */
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

/**
 * 文档排序
 * @param docs
 * @param sorts
 */
export function sortDocs(docs: FlowUsDoc[], sorts?: FlowUsSortItem) {
  return docs.sort((a, b) => {
    if (sorts) {
      let aSortValue = a.properties[sorts.property]
      let bSortValue = b.properties[sorts.property]
      const sortDirection = sorts.direction
      // 如果不存在则不排序
      if (!aSortValue || !bSortValue) {
        return 0
      }
      // 判断是不是数字
      if (Number.isNaN(Number(aSortValue)) || Number.isNaN(Number(bSortValue))) {
        // 如果判断字符串是不是时间
        if (moment(aSortValue).isValid() && moment(bSortValue).isValid()) {
          // 将2023/05/08 00:00转成时间戳
          aSortValue = moment(aSortValue).valueOf()
          bSortValue = moment(bSortValue).valueOf()
        } else {
          // 都不是则排后面
          return -1
        }
      } else {
        aSortValue = Number(aSortValue)
        bSortValue = Number(bSortValue)
      }

      if (sortDirection === FlowUsSortDirectionEnum.ascending) {
        // 正序排序
        return aSortValue - bSortValue
      } else if (sortDirection === FlowUsSortDirectionEnum.descending) {
        // 倒序排序
        return bSortValue - aSortValue
      } else {
        // 属性错误
        return 0
      }
    } else {
      // 不排序
      return 0
    }
  })
}

/**
 * 文档过滤
 * @param docs
 * @param filter
 */
export function filterDocs(docs: FlowUsDoc[], filter?: FlowUsFilterItem | FlowUsFilterItem[]) {
  return docs.filter((page) => {
    const pageProperties = page.properties
    // 过滤
    if (filter && Array.isArray(filter)) {
      return filter.every((f) => {
        return pageProperties[f.property] === f.value
      })
      // 如果是对象
    } else if (typeof filter === 'object') {
      return pageProperties[filter.property] === filter.value
    }
    // 不过滤
    return true
  })
}
