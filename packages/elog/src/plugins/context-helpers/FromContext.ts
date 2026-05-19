import type { DownloadResult, PluginContext } from '../types';
import asyncPool from 'tiny-async-pool';
import {
  asyncPoolFunc,
  DocFrom,
  filterDocs,
  GetDocDetail,
  getDocDetailList,
  GetSortedDocList,
} from '../../doc/download';
import { ElogBaseContext } from './BaseContext';
import { SortedDoc } from '../../types/doc';

/**
 * 适用于 From 写作平台的 Elog 工具类，封装增量过滤和并发下载的共用流程。
 */
export abstract class ElogFromContext extends ElogBaseContext {
  protected constructor(ctx: PluginContext) {
    super(ctx);
  }

  /**
   * 过滤需要更新的文章，统一复用运行时缓存判断规则。
   * @param docs
   */
  protected filterDocs<T>(docs: SortedDoc<T>[]) {
    return filterDocs(this.ctx.cache.docList, docs);
  }

  /**
   * 批量下载，给来源插件保留并发控制但隐藏 tiny-async-pool 细节。
   * @param args
   */
  protected async asyncPool<IN, OUT>(...args: Parameters<typeof asyncPool<IN, OUT>>) {
    return asyncPoolFunc(...args);
  }

  /**
   * 下载文档详情列表，自动注入当前工作流缓存供增量判断使用。
   * @param option
   */
  protected async docDetailList<T extends DocFrom>(option: {
    getSortedDocList: GetSortedDocList<T>;
    getDocDetail: GetDocDetail<T>;
    limit: number | undefined;
  }) {
    return getDocDetailList({
      cachedDocList: this.ctx.cache.docList,
      ...option,
    });
  }

  /** 具体来源插件必须实现完整下载入口，供 from.download 调用。 */
  abstract getDocDetailList(): Promise<DownloadResult>;
}
