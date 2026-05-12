import { DocDetail, SortedDoc } from '../../types/doc';
import out from '../logger';
import asyncPool from 'tiny-async-pool';
import { DocStatus } from '../../const';

/**
 * 过滤需要更新的文章
 * @param cachedDocList
 * @param docs
 */
export const filterDocs = <T>(cachedDocList: DocDetail[], docs: SortedDoc<T>[]) => {
  // 过滤掉被删除的文章
  cachedDocList = cachedDocList.filter((cache) => {
    return docs.findIndex((item) => item.id === cache.id) !== -1;
  });
  let needUpdateDocList: T[] = [];
  let docStatusMap: any = {};
  try {
    for (const doc of docs) {
      // 判断哪些文章是新增的
      const cacheIndex = cachedDocList.findIndex((cacheItem) => cacheItem.id === doc.id);
      // 新增的则加入需要下载的ids列表
      if (cacheIndex < 0) {
        needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
        // 记录被更新文章状态
        docStatusMap[doc.id] = {
          _updateIndex: -1,
          _status: DocStatus.NEW,
        };
      } else {
        // 不是新增的则判断是否文章更新了
        const cacheDoc = cachedDocList[cacheIndex];
        let needUpdate = doc.updateTime !== cacheDoc.updateTime;
        if ([DocStatus.DOC_ERROR, DocStatus.IMAGE_ERROR].includes(cacheDoc._status)) {
          out.warn(
            `上次同步时【${cacheDoc.properties.title}】存在图片/文档下载失败，本次将尝试重新同步。如果并不需要当前文档参与本次同步，请在缓存文件（默认为 elog.cache.json）中找到此文档并删除 _status 字段`,
          );
          needUpdate = true;
        }
        if (needUpdate) {
          // 如果文章更新了则加入需要下载的ids列表, 没有更新则不需要下载
          needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
          // 记录被更新文章状态和索引
          docStatusMap[doc.id] = {
            _updateIndex: cacheIndex,
            _status: DocStatus.UPDATE,
          };
        }
      }
    }
  } catch (e) {
    out.debug(e);
    out.warn(`增量更新失败，请检查文档，${e.message}`);
    return {
      docList: [] as T[],
      docStatusMap: {} as any,
    };
  }
  return {
    docList: needUpdateDocList,
    docStatusMap,
  };
};

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
    process.exit();
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
