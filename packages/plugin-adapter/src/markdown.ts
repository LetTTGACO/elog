import { formatColorBlocks, formatRaw } from './utils'
import { decode } from 'html-entities'

export function markdownAdapter(post: any) {
  let { body } = post
  body = decode(body)
  body = formatColorBlocks(body)
  return formatRaw(body)
}
