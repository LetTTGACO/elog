import frontMatter from 'front-matter';
import { YuQuePwdPublicKey } from './const';
import JSEncrypt from 'jsencrypt-node';
import { YuqueDoc } from './types';
import { PluginContext } from '@elogx-test/elog';

/**
 * 生成元数据
 */
export const getProps = (doc: YuqueDoc, body: string, ctx: PluginContext, isPwd?: boolean) => {
  let properties = {
    // 注入title
    title: doc.title,
    // urlname
    urlname: doc.slug,
    // 创建时间
    // date: timeFormat(doc.created_at),
    date: doc.created_at,
    // 更新时间
    // updated: timeFormat(doc.updated_at),
    updated: doc.updated_at,
  } as any;

  // 封面
  if (doc.cover) {
    properties.cover = doc.cover;
  }
  // 描述
  if (doc?.description) {
    properties.description = doc.custom_description || doc.description;
  }
  try {
    if (!isPwd) {
      // front matter信息的<br/>换成 \n
      const regex = /^---[\s|\S]+?---/i;
      body = body.replace(regex, (a) => a.replace(/(<br \/>|<br>|<br\/>)/gi, '\n'));
    }
    const result = frontMatter(body);
    body = result.body;
    let attributes = <Record<string, string>>result.attributes;
    properties = {
      ...properties,
      ...attributes,
    };

    return {
      body,
      properties,
    };
  } catch (e: any) {
    ctx.warn('front-matter解析失败，将返回预定义属性', e.message);
    ctx.warn('预定义属性：https://elog.1874.cool/notion/raqyleng501h23p1#预定义属性');
    return {
      body,
      properties,
    };
  }
};

/**
 * 处理语雀字符串
 */
export function processMarkdownRaw(raw: string) {
  // 处理不可见字符
  const nul = /\x00/g;
  const nul1 = /\u0000/g;
  const emptyAnchor = /<a name=\".*?\"><\/a>/g;
  const hiddenContent = /<div style="display:none">[\s\S]*?<\/div>/gi;
  raw = raw.replace(nul, '').replace(nul1, '').replace(hiddenContent, '').replace(emptyAnchor, '');
  // 处理换行
  const multiBr = /(<br>[\s\n]){2}/gi;
  const multiBrEnd = /(<br \/>[\n]?){2}/gi;
  const brBug = /<br \/>/g;
  // 删除语雀特有的锚点
  raw = raw.replace(multiBr, '<br>').replace(multiBrEnd, '<br />\n').replace(brBug, '\n');
  return raw;
}

/**
 * 不处理
 * @param doc
 */
export function noProcess(doc: { body: string }) {
  let { body: raw } = doc;
  return raw;
}

/**
 * 加密
 * @param password
 * @returns
 */
export const encrypt = (password: string) => {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(YuQuePwdPublicKey);
  const time = Date.now();
  const symbol = time + ':' + password;
  return encryptor.encrypt(symbol);
};
