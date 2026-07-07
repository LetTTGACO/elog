import type asyncPool from 'tiny-async-pool';
import { ElogBaseContext } from './BaseContext';
import {
  asyncPoolFunc,
  filterDocs as filterSourceDocs,
  getDocDetailList,
  type DocFrom,
  type GetDocDetail,
  type GetSortedDocList,
} from '../source';
import type { DownloadResult, PluginContext } from '../plugin';
import type { SortedDoc } from '../doc';

export abstract class ElogFromContext extends ElogBaseContext {
  protected constructor(ctx: PluginContext) {
    super(ctx);
  }

  protected filterDocs<T>(docs: SortedDoc<T>[]) {
    return filterSourceDocs(this.ctx.cache.docList, docs, this.ctx.logger);
  }

  protected async asyncPool<IN, OUT>(...args: Parameters<typeof asyncPool<IN, OUT>>) {
    return asyncPoolFunc(...args);
  }

  protected async docDetailList<T extends DocFrom>(option: {
    getSortedDocList: GetSortedDocList<T>;
    getDocDetail: GetDocDetail<T>;
    limit: number | undefined;
  }) {
    return getDocDetailList({
      cachedDocList: this.ctx.cache.docList,
      logger: this.ctx.logger,
      ...option,
    });
  }

  abstract getDocDetailList(): Promise<DownloadResult>;
}
