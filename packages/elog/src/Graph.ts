import { PluginDriver } from './utils/PluginDriver';
import { ElogCacheConfig, ElogConfig } from './types/common';
import out from './utils/logger';
import path from 'path';
import { DocDetail, DocExt, DocStructure } from './types/doc';
import fs from 'fs';
import { DocStatus } from './const';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default class Graph {
  readonly pluginDriver: PluginDriver;
  readonly elogConfig: ElogConfig;
  private readonly cachedDocList: DocDetail[] = [];
  constructor(options: ElogConfig) {
    this.elogConfig = options;
    this.cachedDocList = this.initCache(options);
    this.pluginDriver = new PluginDriver(options, this.cachedDocList);
  }

  /**
   * 初始化增量配置
   */
  private initCache(baseConfig: ElogCacheConfig) {
    if (baseConfig.disableCache) {
      out.success('全量更新', '已禁用缓存，将全量更新文档');
      return [];
    } else {
      try {
        const cacheJson = require(path.join(process.cwd(), baseConfig.cacheFilePath));
        const { cachedDocList } = cacheJson;
        // 获取缓存文章
        return cachedDocList as (DocDetail & DocExt)[];
      } catch (error) {
        out.debug('缓存不存在', `未获取到缓存: ${error.message}`);
        out.success('全量更新', '未获取到缓存，将全量更新文档');
        return [];
      }
    }
  }

  /**
   * 写入缓存信息
   * @param sortedDocList
   */
  writeCache(sortedDocList: DocStructure[] = []) {
    try {
      const { cacheFilePath } = this.elogConfig;
      // 判断cachedDocList列表中对象是否有 body 属性
      const hasBody = this.cachedDocList?.some((doc) => !!doc.body);
      if (hasBody) {
        out.debug(
          '警告',
          '缓存信息存在 body（文档内容）信息，可能会导致缓存文件过大，如无必要用途建议删除 body 属性',
        );
      }
      // 写入缓存
      const cacheJson = {
        cachedDocList: this.cachedDocList,
        sortedDocList: sortedDocList,
      };
      fs.writeFileSync(cacheFilePath!, JSON.stringify(cacheJson, null, 2), {
        encoding: 'utf8',
      });
    } catch (e) {
      out.warn('缓存失败', `写入缓存信息失败，请检查，${e.message}`);
    }
  }

  /**
   * 更新缓存
   * @param docList
   * @param docStatusMap
   */
  updateCache(docList: DocDetail[], docStatusMap: any) {
    for (const doc of docList) {
      const { _updateIndex, _status } = docStatusMap[doc.id];
      if (_status === DocStatus.NEW) {
        // 新增文档
        this.cachedDocList.push(doc);
      } else {
        // 更新文档
        this.cachedDocList[_updateIndex] = doc;
      }
    }
  }
  /**
   * 开始同步
   */
  async sync(): Promise<void> {
    // 执行插件的start钩子
    await this.pluginDriver.executeVoidHooks('start', [this.elogConfig]);
    // 从写作平台下载文档
    let {
      docDetailList = [],
      sortedDocList = [],
      docStatusMap,
    } = await this.pluginDriver.executeFromPluginHook('down', []);
    // 执行插件的transform钩子，处理文档详情
    docDetailList = await this.pluginDriver.executeChainHooks('transform', [docDetailList]);
    // 更新缓存
    this.updateCache(docDetailList, docStatusMap);
    // 执行插件的upload钩子，上传文档到目标平台
    await this.pluginDriver.executeVoidHooks('deploy', [docDetailList]);
    // 执行插件的end钩子
    await this.pluginDriver.executeVoidHooks('end', []);
    // 写入缓存
    this.writeCache(sortedDocList);
  }
}
