import { DocDetail } from '@elog/types'
import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'

/**
 * markdown转html（代码高亮）
 * @param post
 */
export function htmlAdapterWithHighlight(post: DocDetail) {
  let { body_html, body } = post
  if (body_html) {
    return body_html
  } else {
    return new MarkdownIt({
      html: true,
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      typographer: true,
      highlight: function (code: string, lang: string) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext'
        return hljs.highlight(code, { language }).value
      },
    }).render(body)
  }
}

/**
 * markdown转html（无代码高亮）
 * @param post
 */
export function htmlAdapter(post: DocDetail) {
  let { body_html, body } = post
  if (body_html) {
    return body_html
  } else {
    return new MarkdownIt({
      html: true,
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      typographer: true,
    }).render(body)
  }
}
