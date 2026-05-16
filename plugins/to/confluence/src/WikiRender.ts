import { Renderer as MarkdownRenderer, marked } from 'marked';
import { stringify } from 'querystring';

/**
 * confluence wiki 语言映射
 */
const langMap: any = {
  javascript: 'js',
  typescript: 'js',
  java: 'java',
  shell: 'bash',
  html: 'html',
  xml: 'xml',
  yaml: 'yml',
};

/**
 * WIKI 渲染器
 */
class WikiRenderer extends MarkdownRenderer {
  constructor() {
    super();
  }

  override paragraph(text: string) {
    return text + '\n\n';
  }
  override html(html: string) {
    return html;
  }
  override heading(text: string, level: number) {
    return 'h' + level + '. ' + text + '\n\n';
  }
  override strong(text: string) {
    return '*' + text + '*';
  }
  override em(text: string) {
    return '_' + text + '_';
  }
  override del(text: string) {
    return '-' + text + '-';
  }
  override codespan(text: string) {
    return '{{' + text + '}}';
  }
  override blockquote(quote: string) {
    return '{quote}' + quote + '{quote}';
  }
  override br() {
    return '\n';
  }
  override hr() {
    return '----';
  }
  override link(href: string, _title: string, text: string) {
    const arr = [href];
    if (text) {
      arr.unshift(text);
    }
    return '[' + arr.join('|') + ']';
  }
  override list(body: string, ordered: boolean) {
    const arr = body.trim().split('\n').filter(Boolean);
    const type = ordered ? '#' : '*';
    return (
      arr
        .map((line) => {
          const isSub = line.startsWith(type);
          return '\n' + type + (isSub ? '' : ' ') + line;
        })
        .join('') + '\n\n'
    );
  }
  override listitem(body: string) {
    return body + '\n';
  }
  override image(href: string) {
    return '!' + href + '!';
  }
  override table(header: string, body: string) {
    return header + body + '\n';
  }
  override tablerow(content: string) {
    return content + '\n';
  }
  override tablecell(
    content: string,
    flags: {
      header: boolean;
    },
  ) {
    const type = flags.header ? '||' : '|';
    return type + content;
  }
  override code(code: string, lang: string) {
    if (lang) {
      lang = lang.toLowerCase();
      lang = langMap[lang] || 'none';
    }
    let config = {
      language: lang,
      borderStyle: 'solid',
      theme: 'default', // dark is good
      linenumbers: true,
      collapse: false,
    };
    const lineCount = code.split('\n').length;
    if (lineCount > 20) {
      // code is too long
      config.collapse = true;
    }
    const param = stringify(config, '|', '=');
    return '{code:' + param + '}\n' + code + '\n{code}\n\n';
  }
}

/**
 * 将markdown转wiki
 * @param markdown
 */
export const md2Wiki = (markdown: string) => {
  const wikiRenderer = new WikiRenderer();
  return marked.parse(markdown, { renderer: wikiRenderer });
};
