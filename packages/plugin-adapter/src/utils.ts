import prettier from 'prettier'

/**
 * 格式化markdown文件
 * @param content
 */
const formatMarkdown = (content: string) => {
  return prettier.format(content, { parser: 'markdown' })
}

/**
 * 格式化html文件
 * @param content
 */
export const formatHtml = (content: string) => {
  return prettier.format(content, {
    parser: 'html',
  })
}

/**
 * 格式化 markdown 内容
 *
 * @param {String} body md 文档
 * @return {String} body
 */
export function formatRaw(body: string) {
  return formatMarkdown(body)
}
