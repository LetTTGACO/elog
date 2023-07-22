import { DocDetail } from '@elog/types'
import { formatHtml } from '../utils'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'

/**
 * markdown转html
 * @param post
 */
export function htmlAdapter(post: DocDetail) {
  let { body_html, body } = post
  if (body_html) {
    return formatHtml(body_html)
  } else {
    const marked = new Marked(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code: string, lang: string) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext'
          return hljs.highlight(code, { language }).value
        },
      }),
    )
    return marked.parse(body, {
      mangle: false,
      headerIds: false,
      gfm: true,
      breaks: true,
      pedantic: false,
      sanitize: false,
      smartypants: false,
    })
  }
}
