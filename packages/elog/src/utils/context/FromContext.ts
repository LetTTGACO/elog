import { PluginContext } from '../../types/plugin';
import asyncPool from 'tiny-async-pool';
import { asyncPoolFunc, filterDocs } from '../doc/form';
import { ElogBaseContext } from './BaseContext';
import { SortedDoc } from '../../types/doc';

/**
 * 适用于 From 写作平台的 Elog 工具类
 */
export class ElogFromContext extends ElogBaseContext {
  constructor(ctx: PluginContext) {
    super(ctx);
  }

  /**
   * 过滤需要更新的文章
   * @param docs
   */
  filterDocs<T>(docs: SortedDoc<T>[]) {
    return filterDocs(this.ctx.cacheDocList, docs);
  }

  /**
   * 批量下载
   * @param args
   */
  async asyncPool<IN, OUT>(...args: Parameters<typeof asyncPool<IN, OUT>>) {
    return asyncPoolFunc(...args);
  }
}
