// write
import YuqueClient, { YuqueConfig } from '@elog/sdk-yuque'
import NotionClient, { NotionConfig } from '@elog/sdk-notion'
// deploy
import DeployClient, { DeployConfig } from '@elog/deploy'
// imageClient
import ImageClient from '@elog/plugin-image'
// types
import { ElogConfig, CacheJSON, DocStatusMap } from './types'
import { BaseDoc, DocDetail } from '@elog/types'
// const
import { WritePlatform, DocStatus } from './const'
// utils
import { out } from '@elog/shared'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 处理器
 */
class Elog {
  /** 配置文件 */
  config: ElogConfig
  /** 下载器 */
  downloaderClient: any
  /** 部署器 */
  deployClient: any
  /** 图片转CDN转换器 */
  imageClient: any
  /** 缓存文章 */
  cachedArticles: DocDetail[] = []
  /** 是否需要更新，当所有文章都不需要更新，这个标记就会阻止后续流程 */
  needUpdate = false
  /** 待更新的文章列表 */
  needUpdateArticles: DocDetail[] = []

  constructor(config: ElogConfig) {
    // 初始化配置
    this.config = config
    // 初始化增量配置
    this.initIncrementalUpdate(config)
    // 初始化写作平台
    this.initWritingPlatform(config)
    // 初始化部署平台
    this.initDeployPlatform(config)
    // 初始化图片转CDN
    this.initImgCdn(config)
  }

  /**
   * 初始化增量配置
   * @param config
   */
  initIncrementalUpdate(config: ElogConfig) {
    try {
      const cacheJson: CacheJSON = require(path.join(process.cwd(), config.extension.cachePath))
      const { docs } = cacheJson
      // 获取缓存文章
      this.cachedArticles = docs || []
    } catch (error) {
      out.info('全量更新', '未获取到缓存，将全量更新文档')
    }
  }

  /**
   * 初始化写作平台
   * @param config
   */
  initWritingPlatform(config: ElogConfig) {
    if (config.write.platform === WritePlatform.YUQUE) {
      let yuqueConfig = config.write.yuque as YuqueConfig
      this.downloaderClient = new YuqueClient(yuqueConfig)
    } else if (config.write.platform === WritePlatform.NOTION) {
      let notionConfig = config.write.notion as NotionConfig
      this.downloaderClient = new NotionClient(notionConfig)
    }
  }

  /**
   * 初始化部署平台
   * @param config
   */
  initDeployPlatform(config: ElogConfig) {
    const deployOptions = config.deploy as DeployConfig
    this.deployClient = new DeployClient(deployOptions)
  }

  /**
   * 初始化图片转CDN配置
   * @param config
   */
  initImgCdn(config: ElogConfig) {
    if (config.image?.enable) {
      this.imageClient = new ImageClient(config.image)
    }
  }

  /**
   * 下载文章详情列表
   */
  async fetchArticles() {
    let articleList = (await this.downloaderClient.getDocList()) as BaseDoc[]
    if (!articleList?.length) {
      this.needUpdate = false
      return
    }
    // 过滤掉被删除的文章
    this.cachedArticles = this.cachedArticles.filter(
      (cache) => articleList.findIndex((item) => item.doc_id === cache.doc_id) !== -1,
    )
    let ids: string[] = []
    let idMap: DocStatusMap = {}
    for (const article of articleList) {
      // 判断哪些文章是新增的
      const cacheIndex = this.cachedArticles.findIndex(
        (cacheItem) => cacheItem.doc_id === article.doc_id,
      )
      // 新增的则加入需要下载的ids列表
      if (cacheIndex < 0) {
        // cacheIndex = _cachedArticles.length;
        ids.push(article.doc_id)
        // 记录被更新文章状态
        idMap[article.doc_id] = {
          status: DocStatus.create,
        }
      } else {
        // 不是新增的则判断是否文章更新了
        const cacheArticle = this.cachedArticles[cacheIndex]
        const cacheAvailable = article.updated === cacheArticle.updated
        if (!cacheAvailable) {
          // 如果文章更新了则加入需要下载的ids列表, 没有更新则不需要下载
          ids.push(article.doc_id)
          // 记录被更新文章状态和索引
          idMap[article.doc_id] = {
            index: cacheIndex,
            status: DocStatus.update,
          }
        }
      }
    }
    // 没有则不需要更新
    if (!ids.length) {
      this.needUpdate = false
      return
    }
    this.needUpdate = true
    let docDetailList = (await this.downloaderClient.getDocDetailList(ids)) as DocDetail[]
    // 处理文章的图片
    if (this.config.image?.enable) {
      docDetailList = await this.processImage(docDetailList)
    }
    // 缓存需要更新的文档
    this.needUpdateArticles = docDetailList
    // 更新缓存里的文章
    for (const docDetail of docDetailList) {
      const { index, status } = idMap[docDetail.doc_id]
      if (status === DocStatus.create) {
        // 新增文档
        this.cachedArticles.push(docDetail)
      } else {
        // 更新文档
        this.cachedArticles[index!] = docDetail
      }
    }
  }

  /**
   * 写入语雀的文章缓存 json 文件
   */
  writeArticleCache() {
    try {
      let catalog: any[] = []
      if (this.config.write.platform === WritePlatform.YUQUE) {
        const yuqueClient = this.downloaderClient as YuqueClient
        catalog = yuqueClient.ctx.catalog
      } else if (this.config.write.platform === WritePlatform.NOTION) {
        const notionClient = this.downloaderClient as NotionClient
        catalog = notionClient.ctx.catalog
      }

      let cacheDocs: DocDetail[] = this.cachedArticles.map((item) => {
        // 只缓存重要属性
        return {
          id: item.id,
          doc_id: item.doc_id,
          title: item.doc_id,
          updated: item.updated,
          body_original: item.body_original,
          properties: item.properties,
          catalog: item.catalog,
          body: '',
        }
      })
      if (this.config.extension?.isFullCache) {
        // 缓存全部属性
        cacheDocs = this.cachedArticles
      }
      const cacheJson: CacheJSON = {
        docs: cacheDocs,
        catalog,
      }
      fs.writeFileSync(this.config.extension.cachePath, JSON.stringify(cacheJson, null, 2), {
        encoding: 'utf8',
      })
    } catch (e: any) {
      out.warning('缓存失败', `写入缓存信息失败，请检查${e.message}`)
    }
  }

  /**
   * 处理文章图片
   */
  async processImage(docDetailList: DocDetail[]) {
    return await this.imageClient.replaceImages(docDetailList)
  }

  /**
   * 部署文章
   */
  async deployArticles() {
    await this.deployClient.deploy(this.needUpdateArticles)
  }

  // 下载文档 => 增量更新文章到缓存 json 文件
  async deploy() {
    // 下载文档
    await this.fetchArticles()
    if (!this.needUpdate) {
      // 结束进程
      out.warning('任务结束', '没有需要更新的文章')
      return
    }
    // 写入文章缓存
    this.writeArticleCache()
    // 部署文章
    await this.deployArticles()
    out.access('任务结束', '🎉更新成功🎉')
  }
}

export default Elog
