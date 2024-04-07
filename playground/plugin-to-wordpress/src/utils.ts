import type { DocDetail } from '@elogx-test/elog';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import { AnyObject, NoRepValues } from './types';

/**
 * markdown转html（代码高亮）
 * @param post
 */
export function htmlAdapterWithHighlight(post: DocDetail) {
  let { body } = post;
  return new MarkdownIt({
    html: true,
    xhtmlOut: true,
    breaks: true,
    linkify: true,
    typographer: true,
    highlight: function (code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }).render(body);
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
