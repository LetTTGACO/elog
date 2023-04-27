import { DocDetail } from '@elog/types'
import { formatHtml } from '../utils'

export function htmlAdapter(post: DocDetail) {
  // NOTE 考虑用markdown转HTMl
  let { body_html = '' } = post
  return formatHtml(body_html)
}
