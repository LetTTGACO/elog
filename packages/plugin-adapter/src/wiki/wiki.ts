import { formatRaw } from '../utils'
import { md2Wiki } from './render'

/**
 * 将markdown转wiki
 * @param post
 */
export function wikiAdapter(post: any) {
  const { body } = post
  const markdown = formatRaw(body)
  return md2Wiki(markdown)
}
