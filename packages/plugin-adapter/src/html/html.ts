import { DocDetail } from '@elog/types'
import { formatHtml } from '../utils'
import { marked } from 'marked'

export function htmlAdapter(post: DocDetail) {
  let { body_html, body } = post
  if (body_html) {
    return formatHtml(body_html)
  } else {
    return marked(body, { mangle: false })
  }
}
