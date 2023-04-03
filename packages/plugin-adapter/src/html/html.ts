import { DocDetail } from '@elog/types'
import { formatHtml } from '../utils'

export function htmlAdapter(post: DocDetail) {
  let { body_html = '' } = post
  return formatHtml(body_html)
}
