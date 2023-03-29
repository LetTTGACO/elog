import { formatRaw } from '../utils'
import { md2Wiki } from './render'
import { DocDetail } from '@elog/types'

/**
 * 将markdown转wiki
 * @param post
 */
export function wikiAdapter(post: DocDetail) {
  const { body } = post
  const markdown = formatRaw(body)
  return md2Wiki(markdown)
}
