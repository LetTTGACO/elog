import path from 'path';
import { createRequire } from 'module';
import { BaseConfig, DocDetail, DocStatus, DocStatusMap, WriteCacheConfig } from '../../types/doc';
import out from '../logger';
import fs from 'fs';
import asyncPool from 'tiny-async-pool';
const require = createRequire(import.meta.url);

/**
 * 初始化增量配置
 */
export const initCacheFunc = (options: BaseConfig) => {
  if (options.disableCache) {
    out.success('全量更新', '已禁用缓存，将全量更新文档');
    return [];
  } else {
    try {
      const cacheJson = require(path.join(process.cwd(), options.cacheFilePath!));
      const { cachedDocList } = cacheJson;
      // 获取缓存文章
      return cachedDocList as DocDetail[];
    } catch (error) {
      out.debug('缓存不存在', `未获取到缓存: ${error.message}`);
      out.success('全量更新', '未获取到缓存，将全量更新文档');
      return [];
    }
  }
};

/**
 * 写入缓存信息
 * @param options
 */
export const writeCacheFunc = (options: WriteCacheConfig & { cacheFilePath: string }) => {
  try {
    const { cachedDocList, sortedDocList, cacheFilePath } = options;
    // 判断cachedDocList列表中对象是否有 body 属性
    const hasBody = cachedDocList?.some((doc) => !!doc.body);
    if (hasBody) {
      out.debug(
        '警告',
        '缓存信息存在 body（文档内容）信息，可能会导致缓存文件过大，如没有必要用途建议删除 body 属性',
      );
    }
    // 写入缓存
    const cacheJson = {
      cachedDocList: cachedDocList,
      sortedDocList: sortedDocList,
    };
    fs.writeFileSync(cacheFilePath!, JSON.stringify(cacheJson, null, 2), {
      encoding: 'utf8',
    });
  } catch (e) {
    out.warn('缓存失败', `写入缓存信息失败，请检查，${e.message}`);
  }
};

/**
 * 过滤需要更新的文章
 * @param cachedDocList
 * @param docs
 * @param idKey
 * @param updateKey
 */
export const filterDocs = <T>(
  cachedDocList: DocDetail[],
  docs: T[],
  idKey: string,
  updateKey: string,
) => {
  // TODO 优化
  // 过滤掉被删除的文章
  cachedDocList = cachedDocList.filter((cache) => {
    return docs.findIndex((item) => (item as any)[idKey] === cache.id) !== -1;
  });
  let needUpdateDocList: T[] = [];
  let idMap: DocStatusMap = {};
  try {
    for (const doc of docs) {
      // 判断哪些文章是新增的
      const cacheIndex = cachedDocList.findIndex(
        (cacheItem) => cacheItem.id === (doc as any)[idKey],
      );
      // 新增的则加入需要下载的ids列表
      if (cacheIndex < 0) {
        needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
        // 记录被更新文章状态
        idMap[(doc as any)[idKey]] = {
          updateIndex: -1,
          status: DocStatus.create,
        };
      } else {
        // 不是新增的则判断是否文章更新了
        const cacheDoc = cachedDocList[cacheIndex];
        let needUpdate = new Date((doc as any)[updateKey]).getTime() !== cacheDoc.updateTime;
        if (cacheDoc.error === 1) {
          out.warn(
            `上次同步时【${cacheDoc.properties.title}】存在图片下载失败，本次将尝试重新同步。如果并不需要当前文档参与本次同步，请在缓存文件（默认为 elog.cache.json）中找到词文档并删除 error 字段`,
          );
          needUpdate = true;
        }
        if (needUpdate) {
          // 如果文章更新了则加入需要下载的ids列表, 没有更新则不需要下载
          needUpdateDocList.push({ ...doc, _index: needUpdateDocList.length + 1 });
          // 记录被更新文章状态和索引
          idMap[(doc as any)[idKey]] = {
            updateIndex: cacheIndex,
            status: DocStatus.update,
          };
        }
      }
    }
  } catch (e) {
    out.debug(e);
    out.warn(`增量更新失败，请检查文档，${e.message}`);
    return {
      docList: [] as T[],
      idMap: {} as DocStatusMap,
    };
  }
  return {
    docList: needUpdateDocList,
    idMap,
  };
};

/**
 * 批量执行请求（异步池）
 * @param args
 */
export const asyncPoolFunc = async <IN, OUT>(...args: Parameters<typeof asyncPool<IN, OUT>>) => {
  const results = [];
  for await (const result of asyncPool<IN, OUT>(...args)) {
    results.push(result);
  }
  return results;
};

/**
 * 更新缓存
 * @param cachedDocList
 * @param docList
 * @param idMap
 */
export const updateCacheFunc = (
  cachedDocList: DocDetail[],
  docList: DocDetail[],
  idMap: DocStatusMap,
) => {
  for (const docDetail of docList) {
    const { updateIndex, status } = idMap[docDetail.id];
    if (status === DocStatus.create) {
      // 新增文档
      cachedDocList.push(docDetail);
    } else {
      // 更新文档
      cachedDocList[updateIndex] = docDetail;
    }
  }
};
