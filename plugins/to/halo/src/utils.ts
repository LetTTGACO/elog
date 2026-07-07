import type { DocDetail } from '@elog/plugin-sdk';

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

export function getIds(items: any, map: any, onMissing?: (item: string) => void) {
  if (!items) return [];
  let list = items;
  if (typeof items === 'string') {
    list = [items];
  }
  return list.flatMap((item: any) => {
    const name = map[item]?.metadata?.name;
    if (!name) {
      onMissing?.(item);
      return [];
    }
    return [name];
  });
}

export async function delay(ms = 500) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
