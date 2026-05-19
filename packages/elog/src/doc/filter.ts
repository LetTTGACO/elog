import { DocStatus } from '../const';
import type { DocDetail, SortedDoc } from '../types/doc';
import out from '../logging/logger';

/** 记录某篇文档在缓存中的位置和本次应写回的状态。 */
export interface DocStatusEntry {
  _updateIndex: number;
  _status: DocStatus;
}

/** 以文档 ID 为索引，让缓存更新阶段无需再次扫描排序列表。 */
export type DocStatusMap = Record<string, DocStatusEntry>;

/** 增量过滤结果同时提供待下载列表和缓存更新所需状态。 */
export interface FilterDocsResult<T> {
  docList: Array<SortedDoc<T> & { _index: number }>;
  docStatusMap: DocStatusMap;
}

/** 根据缓存和源平台更新时间筛选需要重新下载的文档。 */
export function filterDocs<T>(
  cachedDocList: readonly DocDetail[],
  docs: SortedDoc<T>[],
): FilterDocsResult<T> {
  try {
    const needUpdateDocList: Array<SortedDoc<T> & { _index: number }> = [];
    const docStatusMap: DocStatusMap = {};

    for (const doc of docs) {
      const cacheIndex = cachedDocList.findIndex((cacheItem) => cacheItem.id === doc.id);

      // 缓存中不存在的文档视为新增，写回时追加到缓存列表。
      if (cacheIndex < 0) {
        needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
        docStatusMap[doc.id] = { _updateIndex: -1, _status: DocStatus.NEW };
        continue;
      }

      const cacheDoc = cachedDocList[cacheIndex];
      let needUpdate = doc.updateTime !== cacheDoc.updateTime;

      // 上次正文或图片失败的文档即使更新时间没变也要重试，避免错误状态永久卡住。
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
    // 过滤异常时保守返回空列表，避免错误的增量判断触发意外部署。
    out.debug(error);
    out.warn(`增量更新失败，请检查文档，${error.message}`);
    return {
      docList: [],
      docStatusMap: {},
    };
  }
}
