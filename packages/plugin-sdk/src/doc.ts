import type { DocSyncStatusMap, SortedDoc } from '@elog/plugin-contracts';

export interface FilterDocsResult<T> {
  docList: Array<SortedDoc<T> & { _index: number }>;
  docStatusMap: DocSyncStatusMap;
}
