import type { DocDetail, SortedDoc } from '../types/doc';
import out from '../logging/logger';
import asyncPool from 'tiny-async-pool';
import { filterDocs } from './filter';

export { filterDocs } from './filter';
export type { DocSyncStatusMap } from './filter';

/**
 * 批量执行请求（异步池），统一把 tiny-async-pool 的异步迭代结果收集成数组。
 * @param args
 */
export const asyncPoolFunc = async <IN, OUT>(...args: Parameters<typeof asyncPool<IN, OUT>>) => {
  const results = [];
  for await (const result of asyncPool<IN, OUT>(...args)) {
    results.push(result);
  }
  return results;
};

/** 来源插件返回的排序文档最小边界，正文下载前只依赖标题展示进度。 */
export type DocFrom = {
  _index?: number;
  properties: {
    title: string;
  };
};

/** 来源插件提供的列表获取函数，返回值保持源平台排序。 */
export type GetSortedDocList<T extends DocFrom> = () => Promise<SortedDoc<T>[]>;
/** 来源插件提供的详情下载函数，只处理单篇文档。 */
export type GetDocDetail<T extends DocFrom> = (doc: T) => Promise<DocDetail>;

/**
 * 下载文档详情列表，并在下载前完成增量过滤与失败重试判定。
 * @param option
 */
export const getDocDetailList = async <T extends DocFrom>(option: {
  cachedDocList: readonly DocDetail[];
  getSortedDocList: GetSortedDocList<T>;
  getDocDetail: GetDocDetail<T>;
  limit: number | undefined;
}) => {
  const { cachedDocList, getSortedDocList, getDocDetail, limit } = option;

  out.info('正在获取待更新文档，请稍等...');
  // 先保留完整排序列表，缓存写入和部署结果展示都需要这份源平台顺序。
  const sortedDocList = await getSortedDocList();

  // 只下载新增、更新或上次失败的文档，减少来源平台 API 压力。
  const { docList: needUpdateDocList, docStatusMap } = filterDocs(cachedDocList, sortedDocList);
  // 没有待更新文档时仍返回 sortedDocList，便于上层形成完整 skipped 结果。
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
    // _index 是过滤后序号，用于展示本次实际下载进度而非源平台总序号。
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
