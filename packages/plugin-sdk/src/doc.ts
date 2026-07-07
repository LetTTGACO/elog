export const DocSyncStatus = {
  NEW: 1,
  UPDATE: 2,
  IMAGE_ERROR: 3,
  DOC_ERROR: 4,
} as const;

export type DocSyncStatus = (typeof DocSyncStatus)[keyof typeof DocSyncStatus];

export interface DocProperties {
  urlname: string;
  title: string;
  date?: number | string;
  updated?: number | string;
  [key: string]: any;
}

export interface DocStructure {
  id: string;
  title: string;
  [key: string]: any;
}

export type BodyType = 'markdown' | 'html' | 'confluence-wiki';

export interface DocExt {
  _index: number;
  _status: DocSyncStatus;
  _updateIndex: number;
}

export interface DocDetail {
  id: string;
  title: string;
  updateTime: number;
  body: string;
  bodyType?: BodyType;
  rawBody?: string;
  rawBodyType?: BodyType;
  properties: DocProperties;
  docStructure?: DocStructure[];
  [key: string]: any;
}

export type SortedDoc<T> = T & { id: string; updateTime: number };

export interface DocSyncStatusEntry {
  _updateIndex: number;
  _status: DocSyncStatus;
}

export type DocSyncStatusMap = Record<string, DocSyncStatusEntry>;

export interface FilterDocsResult<T> {
  docList: Array<SortedDoc<T> & { _index: number }>;
  docStatusMap: DocSyncStatusMap;
}
