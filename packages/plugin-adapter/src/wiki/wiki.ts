import { md2Wiki } from './render'
import { DocDetail } from '@elog/types'

/**
 * 将markdown转wiki
 * @param post
 */
export function wikiAdapter(post: DocDetail) {
  const { body } = post
  return md2Wiki(body)
}
