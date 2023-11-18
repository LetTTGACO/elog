import frontMatter from 'front-matter'
import unified from 'unified'
import { DocUnite, GetProps } from './types'
import rehypeParse from 'rehype-parse'
import rehypeStringify from 'rehype-stringify'
import { out, timeFormat } from '@elog/shared'
import { YuQuePwdPublicKey } from './const'
import JSEncrypt from 'jsencrypt-node'

/**
 * 生成元数据
 */
export const getProps = (page: DocUnite, isPwd?: boolean): GetProps => {
  let { body } = page
  let properties = {
    // 注入title
    title: page.title,
    // urlname
    urlname: page.slug,
    // 创建时间
    date: timeFormat(page.created_at),
    // 更新时间
    updated: timeFormat(page.updated_at),
  } as any
  // 作者
  if (page.book?.user?.name) {
    properties.author = page.book.user.name
  }
  try {
    if (!isPwd) {
      // front matter信息的<br/>换成 \n
      const regex = /^---[\s|\S]+?---/i
      body = body.replace(regex, (a) => a.replace(/(<br \/>|<br>|<br\/>)/gi, '\n'))
    }
    const result = frontMatter(body)
    body = result.body
    let attributes = <Record<string, string>>result.attributes
    properties = {
      ...properties,
      ...attributes,
    }

    return {
      body,
      properties,
    }
  } catch (e: any) {
    out.warning('front-matter解析失败，将返回预定义属性', e.message)
    out.warning('预定义属性：https://elog.1874.cool/notion/raqyleng501h23p1#预定义属性')
    out.debug(e)
    return {
      body,
      properties,
    }
  }
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
  return raw
}

/**
 * 处理换行
 * @param doc
 */
export function processWordWrap(doc: { body: string }) {
  let { body: raw } = doc
  const multiBr = /(<br>[\s\n]){2}/gi
  const multiBrEnd = /(<br \/>[\n]?){2}/gi
  const brBug = /<br \/>/g
  // 删除语雀特有的锚点
  raw = raw.replace(multiBr, '<br>').replace(multiBrEnd, '<br />\n').replace(brBug, '\n')
  return raw
}

/**
 * 不处理
 * @param doc
 */
export function noProcess(doc: { body: string }) {
  let { body: raw } = doc
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
  try {
    return processHtml(html)
  } catch (e) {
    out.warning('HTML解析失败，将返回原始HTML')
    return html
  }
}

/**
 * 加密
 * @param password
 * @returns
 */
export const encrypt = (password: string) => {
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(YuQuePwdPublicKey)
  const time = Date.now()
  const symbol = time + ':' + password
  return encryptor.encrypt(symbol)
}
