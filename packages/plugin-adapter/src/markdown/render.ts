import unified from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import remarkFrontmatter from 'remark-frontmatter'

/**
 * 处理表格中的特殊字符
 * @param tree
 */
const processTable = (tree: any) => {
  // 找到type为table的节点
  const node = tree.children.find((n: any) => n.type == 'table') as any
  if (node) {
    // 找到tableCell子节点
    for (const tableRow of node.children) {
      for (const tableCell of tableRow.children) {
        // 删除节点
        tableCell.children = tableCell.children.filter((raw: any) => {
          // 判断是不是br
          const isBr = raw.type === 'html' && raw.value === '<br />'
          // 是的话删除这个节点
          return !isBr
        })
      }
    }
  }
}

/**
 * 处理markdown
 * @param content
 */
export const processMarkdown = (content: string) => {
  const processValue = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ['yaml'])
    .use(() => (tree) => {
      processTable(tree)
    })
    .use(remarkStringify)
    // 开始同步执行解析
    .processSync(content)
  return processValue.contents as string
}
