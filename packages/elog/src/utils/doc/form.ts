import type { DocDetail, SortedDoc } from '../../types/doc';
import out from '../logger';
import asyncPool from 'tiny-async-pool';
import { filterDocs } from '../../doc/filter';

export { filterDocs } from '../../doc/filter';
export type { DocStatusMap } from '../../doc/filter';

/**
 * 批量执行请求（异步池）
 * @param args
 */
export const asyncPoolFunc = async <IN, OUT>(...args: Parameters<typeof asyncPool<IN, OUT>>) => {
  const results = [];
  for await (const result of asyncPool<IN, OUT>(...args)) {
    results.push(result);
  }
  return results;
};

export type DocFrom = {
  _index?: number;
  properties: {
    title: string;
  };
};

export type GetSortedDocList<T extends DocFrom> = () => Promise<SortedDoc<T>[]>;
export type GetDocDetail<T extends DocFrom> = (doc: T) => Promise<DocDetail>;

/**
 * 下载文档详情列表
 * @param option
 */
export const getDocDetailList = async <T extends DocFrom>(option: {
  cachedDocList: DocDetail[];
  getSortedDocList: GetSortedDocList<T>;
  getDocDetail: GetDocDetail<T>;
  limit: number | undefined;
}) => {
  const { cachedDocList, getSortedDocList, getDocDetail, limit } = option;

  out.info('正在获取待更新文档，请稍等...');
  // 获取待发布的文章
  const sortedDocList = await getSortedDocList();

  // 过滤不需要更新的文档
  const { docList: needUpdateDocList, docStatusMap } = filterDocs(cachedDocList, sortedDocList);
  // 没有则不需要更新
  if (!needUpdateDocList.length) {
    out.success('任务结束', '没有需要同步的文档');
    return {
      docDetailList: [],
      sortedDocList,
      docStatusMap,
    };
  }
  out.info('待下载数', String(needUpdateDocList.length));
  const promise = async (doc: T) => {
    out.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.properties.title);
    return getDocDetail(doc);
  };
  const docDetailList = await asyncPoolFunc(limit || 10, needUpdateDocList, promise);
  out.info('已下载数', String(needUpdateDocList.length));
  return {
    docDetailList,
    sortedDocList,
    docStatusMap,
  };
};
