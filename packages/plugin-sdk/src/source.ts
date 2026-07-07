import asyncPool from 'tiny-async-pool';
import { DocSyncStatus } from './doc';
import type { DocDetail, DocSyncStatusMap, FilterDocsResult, SortedDoc } from './doc';
import type { DownloadResult, Logger } from './plugin';

type SourceLogger = Pick<Logger, 'debug' | 'info' | 'success' | 'warn'>;

export function filterDocs<T>(
  cachedDocList: readonly DocDetail[],
  docs: SortedDoc<T>[],
  logger?: SourceLogger,
): FilterDocsResult<T> {
  try {
    const needUpdateDocList: Array<SortedDoc<T> & { _index: number }> = [];
    const docStatusMap: DocSyncStatusMap = {};

    for (const doc of docs) {
      const cacheIndex = cachedDocList.findIndex((cacheItem) => cacheItem.id === doc.id);

      if (cacheIndex < 0) {
        needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
        docStatusMap[doc.id] = { _updateIndex: -1, _status: DocSyncStatus.NEW };
        continue;
      }

      const cacheDoc = cachedDocList[cacheIndex];
      let needUpdate = doc.updateTime !== cacheDoc.updateTime;

      if ([DocSyncStatus.DOC_ERROR, DocSyncStatus.IMAGE_ERROR].includes(cacheDoc._status)) {
        logger?.warn(
          `上次同步时【${cacheDoc.properties.title}】存在图片/文档下载失败，本次将尝试重新同步。如果并不需要当前文档参与本次同步，请在缓存文件（默认为 elog.cache.json）中找到此文档并删除 _status 字段`,
        );
        needUpdate = true;
      }

      if (needUpdate) {
        needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
        docStatusMap[doc.id] = { _updateIndex: cacheIndex, _status: DocSyncStatus.UPDATE };
      }
    }

    return {
      docList: needUpdateDocList,
      docStatusMap,
    };
  } catch (error: any) {
    logger?.debug(error);
    logger?.warn(`增量更新失败，请检查文档，${error.message}`);
    return {
      docList: [],
      docStatusMap: {},
    };
  }
}

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

export const getDocDetailList = async <T extends DocFrom>(option: {
  cachedDocList: readonly DocDetail[];
  getSortedDocList: GetSortedDocList<T>;
  getDocDetail: GetDocDetail<T>;
  limit: number | undefined;
  logger?: SourceLogger;
}): Promise<DownloadResult> => {
  const { cachedDocList, getSortedDocList, getDocDetail, limit, logger } = option;

  logger?.info('正在获取待更新文档，请稍等...');
  const sortedDocList = await getSortedDocList();

  const { docList: needUpdateDocList, docStatusMap } = filterDocs(
    cachedDocList,
    sortedDocList,
    logger,
  );
  if (!needUpdateDocList.length) {
    logger?.success('任务结束', '没有需要同步的文档');
    return {
      docDetailList: [],
      sortedDocList,
      docStatusMap,
    };
  }

  logger?.info('待下载数', String(needUpdateDocList.length));
  const promise = async (doc: T & { _index: number }) => {
    logger?.info(`下载文档 ${doc._index}/${needUpdateDocList.length}   `, doc.properties.title);
    return getDocDetail(doc);
  };
  const docDetailList = await asyncPoolFunc(limit || 10, needUpdateDocList, promise);
  logger?.info('已下载数', String(needUpdateDocList.length));

  return {
    docDetailList,
    sortedDocList,
    docStatusMap,
  };
};
