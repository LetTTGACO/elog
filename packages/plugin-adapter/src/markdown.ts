import { formatRaw } from './utils'

export function markdownAdapter(post: any) {
  const { body } = post
  return formatRaw(body)
}
