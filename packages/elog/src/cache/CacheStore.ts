import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { DocStatus } from '../const';
import type { DocDetail, SortedDoc } from '../types/doc';
import type { CacheConfig } from '../runtime/types';
import type { DocStatusMap } from '../doc/filter';
import out from '../logging/logger';

const require = createRequire(import.meta.url);

export class CacheStore {
  readonly config: CacheConfig;
  readonly cachedDocList: DocDetail[];

  constructor(config: CacheConfig) {
    this.config = config;
    this.cachedDocList = this.load();
  }

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

  update(docList: DocDetail[], docStatusMap: DocStatusMap) {
    for (const doc of docList) {
      const status = docStatusMap[doc.id];
      if (!status) {
        continue;
      }

      if (status._status === DocStatus.NEW) {
        this.cachedDocList.push(doc);
      } else {
        this.cachedDocList[status._updateIndex] = doc;
      }
    }
  }

  write<T>(sortedDocList: SortedDoc<T>[] = []) {
    const cacheJson = {
      cachedDocList: this.cachedDocList.map((item) => {
        const { body: _body, ...docWithoutBody } = item;
        return docWithoutBody;
      }),
      sortedDocList,
    };

    fs.writeFileSync(this.config.filePath, JSON.stringify(cacheJson, null, 2), {
      encoding: 'utf8',
    });
  }
}
