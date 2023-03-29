import { formatRaw } from '../utils'
import { DocDetail } from '../types'

export function markdownAdapter(post: DocDetail) {
  let { body } = post
  return formatRaw(body)
}
