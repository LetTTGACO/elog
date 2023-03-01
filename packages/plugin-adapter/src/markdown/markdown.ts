import { formatRaw } from '../utils'

export function markdownAdapter(post: any) {
  let { body } = post
  return formatRaw(body)
}
