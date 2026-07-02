import { NotionDoc } from './types';
import { DocProperties } from '@elog/cli';

function formatTime(time: string | number | Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: process.env.TIME_ZONE || 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(time))
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/**
 * 获取元数据Val
 * @param data
 */
export function getPropVal(data: any) {
  let val = data[data.type];
  if (!val) return '';
  switch (data.type) {
    case 'multi_select':
      return val.map((a: any) => a.name);
    case 'select':
      return val.name;
    case 'date':
      return val.start ? formatTime(val.start) : '';
    case 'rich_text':
    case 'title':
      return val.map((a: any) => a.plain_text).join('');
    case 'text':
      return data.plain_text;
    case 'files':
      if (val.length < 1) return '';
      return val[0][val[0].type].url;
    default:
      return val;
  }
}

/**
 * 生成元数据
 * @param {*} page
 * @returns {Object}
 */
export function props(page: NotionDoc): DocProperties {
  let properties: any = {};
  if (!Object.keys(page.properties).length) return properties;
  let titleKey = '';
  for (const key in page.properties) {
    if (page.properties[key]?.type === 'title') {
      titleKey = key;
    }
    properties[key] = getPropVal(page.properties[key]);
  }
  if (!properties.cover && page.cover) {
    const type = page.cover.type;
    if (type) {
      properties.cover = (page.cover as any)[type].url;
    }
  }
  // 单独处理title
  if (!properties.title) {
    const titleVal = page.properties[titleKey].title;
    properties.title = titleVal.map((a: any) => a.plain_text).join('');
  }
  // 单独处理urlname
  if (!properties.urlname) {
    properties.urlname = page.id;
  }
  // date
  if (!properties.date) {
    properties.date = formatTime(page.created_time);
  }
  if (!properties.updated) {
    properties.updated = formatTime(page.last_edited_time);
  }
  return properties;
}
