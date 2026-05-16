import {
  WoLaiDatabaseTableProperty,
  WoLaiDoc,
  WolaiFilterItem,
  WolaiSortItem,
  WoLaiTableRow,
} from './types';
import { WolaiSortDirectionEnum } from './const';
import { DocDetail, DocProperties, DocStructure, SortedDoc } from '@elogx-test/elog';

/**
 * 获取元数据Val
 * @param data
 * @param tableFields
 */
export function getPropVal(
  data: WoLaiTableRow['properties'],
  tableFields: WoLaiDatabaseTableProperty[],
) {
  const properties: any = {};
  tableFields.forEach((field) => {
    if (data[field.id]) {
      switch (field.type) {
        case 'primary':
          properties.title = data[field.id][0][0];
          break;
        case 'date':
          // 只取开始时间
          properties[field.name] = data[field.id][0][1][0][2].start_date;
          break;
        case 'multi_select':
          // 取数组
          const ids = data[field.id][0][1][0][1];
          properties[field.name] = field.options.map((opt) => {
            return ids.includes(opt.option_id) ? opt.value : '';
          });
          break;
        case 'checkbox':
          // 取 boolean
          properties[field.name] = data[field.id][0][0] === 'True';
          break;
        case 'file':
          // TODO 处理文件
          break;
        case 'select':
        case 'text':
        case 'number':
        case 'url':
        case 'people':
        case 'email':
        case 'phone':
          properties[field.name] = String(data[field.id][0][0]);
          break;
        default:
          break;
      }
    }
  });
  return properties;
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
  let properties: any = {};
  if (!Object.keys(page.properties).length) return properties;
  // const titleField = tableFields.find((item) => item.type === 'primary')!.id
  properties = getPropVal(page.properties, tableFields);
  // 单独处理urlname
  if (!properties.urlname) {
    properties.urlname = page.block_id;
  }
  // date
  if (!properties.date) {
    // TODO properties 属性确定
    properties.date = page.created_time;
    // properties.date = timeFormat(page.created_time)
  }
  if (!properties.updated) {
    // properties.updated = timeFormat(page.edited_time)
    properties.updated = page.edited_time;
  }
  return properties;
}

export function genCatalog(doc: DocDetail, property: string): DocStructure[] | undefined {
  const catalog = doc.properties[property];
  if (!catalog) {
    console.warn(`${doc.properties.title} ${property} 属性缺失`);
    return undefined;
  } else if (typeof catalog === 'string') {
    // 单选
    return [
      {
        title: catalog,
        id: doc.doc_id,
      },
    ];
  } else if (Array.isArray(catalog)) {
    // 多选
    return catalog.map((item) => {
      return {
        title: item,
        id: doc.doc_id,
      };
    });
  } else {
    // 没有值
    console.warn(`${doc.properties.title} 文档分类信息提取失败，${property} 字段只能是单选/多选`);
    return undefined;
  }
}

/**
 * 文档排序
 * @param docs
 * @param sorts
 */
export function sortDocs(docs: SortedDoc<WoLaiDoc>[], sorts?: WolaiSortItem) {
  return docs.sort((a, b) => {
    if (sorts) {
      let aSortValue = a.properties[sorts.property];
      let bSortValue = b.properties[sorts.property];
      const sortDirection = sorts.direction;
      // 如果不存在则不排序
      if (!aSortValue || !bSortValue) {
        return 0;
      }
      // 判断是不是数字
      if (Number.isNaN(Number(aSortValue)) || Number.isNaN(Number(bSortValue))) {
        // 都不是则排后面
        // 给出警告
        console.warn(`${a.properties.title} ${sorts.property} 不是数字`);
        return -1;
      } else {
        aSortValue = Number(aSortValue);
        bSortValue = Number(bSortValue);
      }

      if (sortDirection === WolaiSortDirectionEnum.ascending) {
        // 正序排序
        return aSortValue - bSortValue;
      } else if (sortDirection === WolaiSortDirectionEnum.descending) {
        // 倒序排序
        return bSortValue - aSortValue;
      } else {
        // 属性错误
        return 0;
      }
    } else {
      // 不排序
      return 0;
    }
  });
}

/**
 * 文档过滤
 * @param docs
 * @param filter
 */
export function filterDocs(
  docs: SortedDoc<WoLaiDoc>[],
  filter?: WolaiFilterItem | WolaiFilterItem[],
) {
  return docs.filter((page) => {
    const pageProperties = page.properties;
    // 过滤
    if (filter && Array.isArray(filter)) {
      return filter.every((f) => {
        return pageProperties[f.property] === f.value;
      });
      // 如果是对象
    } else if (typeof filter === 'object') {
      return pageProperties[filter.property] === filter.value;
    }
    // 不过滤
    return true;
  });
}
