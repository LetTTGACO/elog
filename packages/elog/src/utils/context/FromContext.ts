import type { DownloadResult, PluginContext } from '../../plugins/types';
import asyncPool from 'tiny-async-pool';
import {
  asyncPoolFunc,
  DocFrom,
  filterDocs,
  GetDocDetail,
  getDocDetailList,
  GetSortedDocList,
} from '../doc/form';
import { ElogBaseContext } from './BaseContext';
import { SortedDoc } from '../../types/doc';

/**
 * 适用于 From 写作平台的 Elog 工具类
 */
export abstract class ElogFromContext extends ElogBaseContext {
  protected constructor(ctx: PluginContext) {
    super(ctx);
  }

  /**
   * 过滤需要更新的文章
   * @param docs
   */
  protected filterDocs<T>(docs: SortedDoc<T>[]) {
    return filterDocs(this.ctx.cache.docList, docs);
  }

  /**
   * 批量下载
   * @param args
   */
  protected async asyncPool<IN, OUT>(...args: Parameters<typeof asyncPool<IN, OUT>>) {
    return asyncPoolFunc(...args);
  }

  /**
   * 下载文档详情列表
   * @param option
   */
  protected async docDetailList<T extends DocFrom>(option: {
    getSortedDocList: GetSortedDocList<T>;
    getDocDetail: GetDocDetail<T>;
    limit: number | undefined;
  }) {
    return getDocDetailList({
      cachedDocList: [...this.ctx.cache.docList],
      ...option,
    });
  }

  abstract getDocDetailList(): Promise<DownloadResult>;
}
