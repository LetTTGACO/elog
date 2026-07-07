import { filterDocs as filterPluginDocs } from '@elog/plugin-sdk';
import type { DocDetail, SortedDoc } from '../types/doc';
import out from '../logging/logger';

export type { DocSyncStatusEntry, DocSyncStatusMap, FilterDocsResult } from '@elog/plugin-sdk';

/** 根据缓存和源平台更新时间筛选需要重新下载的文档。 */
export function filterDocs<T>(cachedDocList: readonly DocDetail[], docs: SortedDoc<T>[]) {
  return filterPluginDocs(cachedDocList, docs, out);
}
