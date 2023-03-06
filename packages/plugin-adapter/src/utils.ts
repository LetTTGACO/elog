import prettier from 'prettier'
import { processMarkdown } from './markdown/render'

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
  body = processMarkdown(body)
  body = formatColorBlocks(body)
  const multiBr = /(<br>[\s\n]){2}/gi
  const multiBrEnd = /(<br \/>[\n]?){2}/gi
  const brBug = /<br \/>/g
  const nul = /\x00/g
  const nul1 = /\u0000/g
  const hiddenContent = /<div style="display:none">[\s\S]*?<\/div>/gi
  // 删除语雀特有的锚点
  const emptyAnchor = /<a name=\".*?\"><\/a>/g
  body = body
    .replace(hiddenContent, '')
    .replace(nul, '')
    .replace(nul1, '')
    .replace(multiBr, '<br>')
    .replace(multiBrEnd, '<br />\n')
    .replace(brBug, '\n')
    .replace(emptyAnchor, '')
  return formatMarkdown(body)
}
