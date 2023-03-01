import { DocDetail, Properties } from '../types'
import matter from 'gray-matter'
import { formatRaw } from '../utils'

/**
 * hexo 文章生产适配器
 *
 * @param {DocDetail} post 文章
 * @return {String} text
 */
export function matterMarkdownAdapter(post: DocDetail) {
  let body = post.body
  const properties = post.properties
  const props: Properties = {
    ...properties,
    title: properties.title.replace(/"/g, ''), // 临时去掉标题中的引号，至少保证文章页面是正常可访问的
  }
  const raw = matter.stringify(body, props)
  return formatRaw(raw)
}

export default matterMarkdownAdapter
