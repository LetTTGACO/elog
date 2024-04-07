import type { DocDetail } from '@elogx-test/elog';
import MarkdownIt from 'markdown-it';

interface NoRepValues {
  tags: string[];
  categories: string[];
}

export function getNoRepValues(
  posts: DocDetail[],
  tagKey: string,
  categoryKey: string,
): NoRepValues {
  const values = posts.reduce(
    (acc: NoRepValues, cur) => {
      const tag = cur.properties[tagKey] as string | string[];
      const category = cur.properties[categoryKey] as string | string[];
      if (typeof tag === 'string') {
        acc.tags.push(tag);
      } else if (Array.isArray(tag)) {
        acc.tags = acc.tags.concat(tag);
      }
      if (typeof category === 'string') {
        acc.categories.push(category);
      } else if (Array.isArray(category)) {
        acc.categories = acc.categories.concat(category);
      }
      return acc;
    },
    { tags: [], categories: [] },
  );
  // 去重
  return {
    tags: Array.from(new Set(values.tags)),
    categories: Array.from(new Set(values.categories)),
  };
}

interface AnyObject {
  [key: string]: any;
}

/**
 * 删除对象中的空属性
 * @param obj
 */
export const removeEmptyProperties = (obj: AnyObject): AnyObject => {
  const filteredObj: AnyObject = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '' && value.length !== 0) {
      filteredObj[key] = value;
    }
  });

  return filteredObj;
};

/**
 * markdown转html（无代码高亮）
 * @param doc
 */
export function htmlAdapter(doc: DocDetail) {
  let { body } = doc;
  return new MarkdownIt({
    html: true,
    xhtmlOut: true,
    breaks: true,
    linkify: true,
    typographer: true,
  }).render(body);
}
export function getIds(items: any, map: any) {
  if (!items) return [];
  let list = items;
  if (typeof items === 'string') {
    list = [items];
  }
  return list.map((item: any) => {
    return map[item].metadata.name;
  });
}

export async function delay(ms = 500) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
