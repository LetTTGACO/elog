import { DocStatus } from '../const';
import type { DocDetail, SortedDoc } from '../types/doc';
import out from '../logging/logger';

export interface DocStatusEntry {
  _updateIndex: number;
  _status: DocStatus;
}

export type DocStatusMap = Record<string, DocStatusEntry>;

export interface FilterDocsResult<T> {
  docList: Array<SortedDoc<T> & { _index: number }>;
  docStatusMap: DocStatusMap;
}

export function filterDocs<T>(
  cachedDocList: readonly DocDetail[],
  docs: SortedDoc<T>[],
): FilterDocsResult<T> {
  try {
    const needUpdateDocList: Array<SortedDoc<T> & { _index: number }> = [];
    const docStatusMap: DocStatusMap = {};

    for (const doc of docs) {
      const cacheIndex = cachedDocList.findIndex((cacheItem) => cacheItem.id === doc.id);

      if (cacheIndex < 0) {
        needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
        docStatusMap[doc.id] = { _updateIndex: -1, _status: DocStatus.NEW };
        continue;
      }

      const cacheDoc = cachedDocList[cacheIndex];
      let needUpdate = doc.updateTime !== cacheDoc.updateTime;

      if ([DocStatus.DOC_ERROR, DocStatus.IMAGE_ERROR].includes(cacheDoc._status)) {
        out.warn(
          `上次同步时【${cacheDoc.properties.title}】存在图片/文档下载失败，本次将尝试重新同步。如果并不需要当前文档参与本次同步，请在缓存文件（默认为 elog.cache.json）中找到此文档并删除 _status 字段`,
        );
        needUpdate = true;
      }

      if (needUpdate) {
        needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
        docStatusMap[doc.id] = { _updateIndex: cacheIndex, _status: DocStatus.UPDATE };
      }
    }

    return {
      docList: needUpdateDocList,
      docStatusMap,
    };
  } catch (error: any) {
    out.debug(error);
    out.warn(`增量更新失败，请检查文档，${error.message}`);
    return {
      docList: [],
      docStatusMap: {},
    };
  }
}
