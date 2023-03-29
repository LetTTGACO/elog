import prettier from 'prettier'

/**
 * 格式化markdown文件
 * @param content
 */
const formatMarkdown = (content: string) => {
  return prettier.format(content, { parser: 'markdown' })
}

// 背景色区块支持
const colorBlocks: any = {
  ':::tips\n':
    '<div style="background: #FFFBE6;padding:10px;border: 1px solid #C3C3C3;border-radius:5px;margin-bottom:5px;">',
  ':::danger\n':
    '<div style="background: #FFF3F3;padding:10px;border: 1px solid #DEB8BE;border-radius:5px;margin-bottom:5px;">',
  ':::info\n':
    '<div style="background: #E8F7FF;padding:10px;border: 1px solid #ABD2DA;border-radius:5px;margin-bottom:5px;">',
  '\\s+:::': '</div>',
}

/**
 * 背景色区块支持
 * @param body
 */
export const formatColorBlocks = (body: string) => {
  for (const key in colorBlocks) {
    body = body.replace(new RegExp(key, 'igm'), colorBlocks[key])
  }
  return body
}

/**
 * 格式化 markdown 内容
 *
 * @param {String} body md 文档
 * @return {String} body
 */
export function formatRaw(body: string) {
  body = formatColorBlocks(body)
  return formatMarkdown(body)
}
