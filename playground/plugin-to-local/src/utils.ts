import { DocDetail, DocProperties } from '@elogx-test/elog';
import matter from 'gray-matter';

/**
 * 将文档属性转换为 Front matter 格式
 * @param doc
 */
export function matterMarkdownAdapter(doc: DocDetail) {
  let body = doc.body;
  try {
    const properties = doc.properties;
    const props: DocProperties = {
      ...properties,
      title: properties?.title?.replace(/"/g, ''), // 临时去掉标题中的引号，至少保证文章页面是正常可访问的
    };
    // @ts-ignore
    body = matter.stringify(body, props, { lineWidth: -1 });
  } catch (e) {
    console.warn(`【${doc.properties.title}】Front matter 生成失败，请检查文档属性`, e.message);
  }
  return body;
}

/**
 * 返回文档 body
 * @param doc
 */
export function markdownAdapter(doc: DocDetail) {
  let { body } = doc;
  return body;
}
