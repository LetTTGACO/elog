import matter from 'gray-matter'
import { formatRaw } from '../utils'
import { DocDetail, DocProperties } from '@elog/types'
import { out } from '@elog/shared'

/**
 * hexo 文章生产适配器
 *
 * @param {DocDetail} post 文章
 * @return {String} text
 */
export function matterMarkdownAdapter(post: DocDetail) {
  let body = post.body
  try {
    const properties = post.properties
    const props: DocProperties = {
      ...properties,
      title: properties.title.replace(/"/g, ''), // 临时去掉标题中的引号，至少保证文章页面是正常可访问的
    }
    body = matter.stringify(body, props)
  } catch (e: any) {
    out.err(e.message)
    out.warning(`【${post.properties.title}】Front matter 生成失败，请检查文档属性`)
  }
  return formatRaw(body)
}

export default matterMarkdownAdapter
