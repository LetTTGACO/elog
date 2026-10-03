import { readFile } from 'node:fs/promises';
import { getDocDetailList, type DocDetail, type FromPlugin } from '@elog/plugin-sdk';

export interface FromJsonOptions {
  file: string;
  include?: (doc: DocDetail) => boolean;
}

export default function fromJson(options: FromJsonOptions): FromPlugin {
  return {
    name: 'from:json',
    kind: 'from',
    async download(ctx) {
      const input: unknown = JSON.parse(await readFile(options.file, 'utf8'));
      if (!Array.isArray(input)) return ctx.logger.error('JSON 来源必须是文档数组');

      const docs: DocDetail[] = [];
      const ids = new Set<string>();
      for (const doc of input) {
        if (
          !doc ||
          typeof doc.id !== 'string' ||
          !doc.id ||
          typeof doc.title !== 'string' ||
          !Number.isFinite(doc.updateTime) ||
          typeof doc.body !== 'string' ||
          typeof doc.properties?.title !== 'string' ||
          typeof doc.properties?.urlname !== 'string'
        ) {
          ctx.logger.error('JSON 文档需要 id、title、updateTime、body 和 properties.title/urlname');
        }
        if (ids.has(doc.id)) ctx.logger.error(`JSON 来源存在重复 ID：${doc.id}`);
        ids.add(doc.id);
        docs.push(doc);
      }

      // 筛选发生在增量比较前，完整列表和待同步文档使用同一个来源范围。
      const selected = docs.filter((doc) => options.include?.(doc) ?? true);
      const byId = new Map(selected.map((doc) => [doc.id, doc]));
      return getDocDetailList({
        cachedDocList: ctx.cache.docList,
        logger: ctx.logger,
        limit: 1,
        getSortedDocList: async () =>
          selected.map(({ id, title, updateTime, properties }) => ({
            id,
            title,
            updateTime,
            properties,
          })),
        getDocDetail: async ({ id }) => byId.get(id)!,
      });
    },
  };
}
