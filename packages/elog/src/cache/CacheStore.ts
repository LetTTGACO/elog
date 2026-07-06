import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { DocStatus } from '../const';
import type { DocDetail, SortedDoc } from '../types/doc';
import type { CacheConfig } from '../runtime/types';
import type { DocStatusMap } from '../doc/filter';
import out from '../logging/logger';

const require = createRequire(import.meta.url);

/** 负责单个工作流的缓存读写，运行时只通过这里理解缓存文件结构。 */
export class CacheStore {
  readonly config: CacheConfig;
  readonly cachedDocList: DocDetail[];

  constructor(config: CacheConfig) {
    this.config = config;
    this.cachedDocList = this.load();
  }

  /** 加载缓存失败时按全量同步处理，避免缓存缺失阻断首次运行。 */
  private load(): DocDetail[] {
    if (this.config.disabled) {
      out.success('全量更新', '已禁用缓存，将全量更新文档');
      return [];
    }

    try {
      const cachePath = path.resolve(process.cwd(), this.config.filePath);
      const cacheJson = require(cachePath);
      return cacheJson.cachedDocList ?? [];
    } catch (error: any) {
      out.debug('缓存不存在', `未获取到缓存: ${error.message}`);
      out.success('全量更新', '未获取到缓存，将全量更新文档');
      return [];
    }
  }

  /** 根据增量判定结果更新内存缓存，新增和更新文档复用同一批下载结果。 */
  update(docList: DocDetail[], docStatusMap: DocStatusMap) {
    for (const doc of docList) {
      const status = docStatusMap[doc.id];
      // 来源插件可能返回不参与缓存更新的文档，这里保持跳过而不是报错。
      if (!status) {
        continue;
      }

      const cacheDoc = doc.error === 1 ? { ...doc, _status: DocStatus.IMAGE_ERROR } : doc;

      if (status._status === DocStatus.NEW) {
        this.cachedDocList.push(cacheDoc);
      } else {
        this.cachedDocList[status._updateIndex] = cacheDoc;
      }
    }
  }

  /** 写入缓存时剥离正文和原始正文，避免缓存文件过大并减少敏感内容落盘。 */
  write<T>(sortedDocList: SortedDoc<T>[] = []) {
    if (this.config.writeDisabled) {
      return;
    }

    const sortedDocIds = new Set(sortedDocList.map((doc) => doc.id));
    const cacheJson = {
      cachedDocList: this.cachedDocList
        .filter((item) => sortedDocIds.has(item.id))
        .map((item) => {
          const { body: _body, rawBody: _rawBody, ...docWithoutBody } = item;
          return docWithoutBody;
        }),
      sortedDocList,
    };

    fs.writeFileSync(this.config.filePath, JSON.stringify(cacheJson, null, 2), {
      encoding: 'utf8',
    });
  }
}
