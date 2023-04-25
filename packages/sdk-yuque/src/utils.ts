import frontMatter from 'front-matter'
import moment from 'moment'
import unified from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkStringify from '@elog/remark-stringify'
import remarkFrontMatter from 'remark-frontmatter'
import { DocUnite, GetProps } from './types'
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import { out } from '@elog/shared'

/**
 * 检查front-matter的长度
 * @param page
 * @param properties
 */
const checkFrontMatter = (page: DocUnite, properties: Record<string, string>) => {
  Object.values(properties).forEach((value: string, index) => {
    const key = Object.keys(properties)[index]
    if (value?.length > 78) {
      out.warning(
        `警告！${page.title}文档中${key}属性值长度超过78个字符，在front-matter模式下可能会导致博客平台解析失败`,
      )
      out.warning('详情：https://github.com/nodeca/js-yaml/blob/HEAD/test/units/snippet.js#L43-L44')
    }
  })
}

/**
 * 生成元数据
 */
export const getProps = (page: DocUnite): GetProps => {
  let { body } = page
  let properties = {
    // 注入title
    title: page.title,
    // urlname
    urlname: page.slug,
    // 作者
    author: page.book.user.name,
    // 创建时间
    date: formatDate(page.created_at),
    // 更新时间
    updated: formatDate(page.updated_at),
  }
  try {
    // front matter信息的<br/>换成 \n
    const regex = /^---[\s|\S]+?---/i
    body = body.replace(regex, (a) => a.replace(/(<br \/>|<br>|<br\/>)/gi, '\n'))
    const result = frontMatter(body)
    body = result.body
    let attributes = <Record<string, string>>result.attributes
    checkFrontMatter(page, attributes)
    properties = {
      ...properties,
      ...attributes,
    }

    return {
      body,
      properties,
    }
  } catch (e: any) {
    out.warning('front-matter解析失败，将返回预定义属性')
    out.warning('预定义属性：https://elog.1874.cool/notion/raqyleng501h23p1#预定义属性')
    out.warning(e.message)
    return {
      body,
      properties,
    }
  }
}

/**
 * 格式化日期
 * @param date
 */
export function formatDate(date: Date) {
  return moment(date).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 处理表格中的特殊字符
 * @param tree
 */
const processTable = (tree: any) => {
  // 找到type为table的节点
  for (const node of tree.children) {
    if (node.type == 'table') {
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
}

/**
 * 处理markdown
 * @param content
 */
export const processMarkdown = (content: string) => {
  const processValue = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontMatter, ['yaml'])
    .use(() => (tree) => {
      processTable(tree)
    })
    .use(remarkStringify)
    // 开始同步执行解析
    .processSync(content)
  return processValue.contents as string
}

/**
 * 处理语雀字符串
 */
export function processMarkdownRaw(raw: string) {
  // 处理不可见字符
  const nul = /\x00/g
  const nul1 = /\u0000/g
  const emptyAnchor = /<a name=\".*?\"><\/a>/g
  const hiddenContent = /<div style="display:none">[\s\S]*?<\/div>/gi
  raw = raw.replace(nul, '').replace(nul1, '').replace(hiddenContent, '').replace(emptyAnchor, '')
  // 处理markdown
  // raw = processMarkdown(raw)
  const multiBr = /(<br>[\s\n]){2}/gi
  const multiBrEnd = /(<br \/>[\n]?){2}/gi
  const brBug = /<br \/>/g
  // 删除语雀特有的锚点
  raw = raw.replace(multiBr, '<br>').replace(multiBrEnd, '<br />\n').replace(brBug, '\n')
  return raw
}

/**
 * 语雀css文件
 */
const cssStyle = [
  {
    type: 'element',
    tagName: 'link',
    properties: {
      rel: ['stylesheet'],
      href: 'http://editor.yuque.com/ne-editor/lake-content-v1.css',
    },
    children: [],
  },
  {
    type: 'text',
    value: '\n    ',
  },
]

const findHead = (node: any) => {
  // 如果当前节点是一个 element，而且它的 tagName 是 "head"，那么就返回它
  if (node.type === 'element' && node.tagName === 'head') {
    node.children.push(...cssStyle)
  }
  // 否则，继续递归遍历它的 children 数组
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      findHead(child)
    }
  }
}

/**
 * 处理Html
 * @param content
 */
const processHtml = (content: string) => {
  const processValue = unified()
    .use(rehypeParse)
    .use(() => (tree) => {
      // processTable(tree)
      findHead(tree)
    })
    .use(rehypeStringify)
    // 开始同步执行解析
    .processSync(content)
  return processValue.contents as string
}

/**
 * 处理语雀的HTML
 * @param html
 */
export const processHtmlRaw = (html: string) => {
  // 给语雀的HTML头部加上css文件
  return processHtml(html)
}
