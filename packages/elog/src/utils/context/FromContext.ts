import { PluginContext } from '../../types/plugin';
import { BaseConfig, DocDetail, DocStatusMap, WriteCacheConfig } from '../../types/doc';
import asyncPool from 'tiny-async-pool';
import {
  asyncPoolFunc,
  filterDocs,
  initCacheFunc,
  updateCacheFunc,
  writeCacheFunc,
} from '../doc/form';
import { ElogBaseContext } from './BaseContext';

/**
 * 适用于 From 写作平台的 Elog 工具类
 */
export class ElogFromContext extends ElogBaseContext {
  public cachedDocList: DocDetail[] = [];
  private readonly baseConfig: BaseConfig;
  constructor(ctx: PluginContext, baseConfig: BaseConfig) {
    super(ctx);
    this.baseConfig = baseConfig;
    this.cachedDocList = this.initCache(baseConfig);
  }

  /**
   * 初始化增量配置
   */
  private initCache(baseConfig: BaseConfig) {
    return initCacheFunc(baseConfig);
  }

  /**
   * 写入缓存信息
   * @param options
   */
  writeCache(options: WriteCacheConfig) {
    let { cachedDocList } = options;
    if (!cachedDocList?.length) {
      cachedDocList = this.cachedDocList.map((item) => ({
        id: item.id,
        title: item.title,
        updateTime: item.updateTime,
        properties: item.properties,
        docStructure: item.docStructure,
        error: item.error,
      }));
    }
    writeCacheFunc({
      cachedDocList,
      sortedDocList: options.sortedDocList,
      cacheFilePath: this.baseConfig.cacheFilePath!,
    });
  }

  /**
   * 过滤需要更新的文章
   * @param docs
   * @param idKey
   * @param updateKey
   */
  filterDocs<T>(docs: T[], idKey: string, updateKey: string) {
    return filterDocs(this.cachedDocList, docs, idKey, updateKey);
  }

  /**
   * 批量下载
   * @param args
   */
  async asyncPool<IN, OUT>(...args: Parameters<typeof asyncPool<IN, OUT>>) {
    return asyncPoolFunc(...args);
  }

  /**
   * 更新缓存
   * @param docList
   * @param idMap
   */
  updateCache(docList: DocDetail[], idMap: DocStatusMap) {
    updateCacheFunc(this.cachedDocList, docList, idMap);
  }
}
