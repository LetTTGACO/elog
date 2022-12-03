import * as fs from 'fs'
import * as path from 'path'
// writing-platform
import Yuque, { YuqueConfig } from '@elog/sdk-yuque'
import Notion, { NotionConfig } from '@elog/sdk-notion'
// deploy-platform
import Deploy, { DeployOptions } from '@elog/deploy'
// imgCdnClient
import ImgCdnClient from '@elog/plugin-image'

// types
import {
  DeployPlatform,
  Doc,
  DocDetail,
  DocStatus,
  DocStatusMap,
  ElogConfig,
  WritingPlatform,
} from './types'
import { __cwd, CACHE_FILE_NAME, LAST_GENERATE_FILE_NAME } from './const'
import { out } from '@elog/shared'

/**
 * 处理器
 */
class Elog {
  /** 配置文件 */
  config: ElogConfig
  /** 下载器 */
  downloaderClient!: Yuque | Notion
  /** 部署器 */
  deployClient: any
  /** 图片转CDN转换器 */
  imgCdnClient: any
  /** 文章缓存路径 */
  articleCachePath: string
  /** 缓存文章 */
  cachedArticles: DocDetail[] = []
  /** 增量更新路径 */
  lastGeneratePath: string | undefined
  /** 增量更新时间戳 */
  lastGenerate = 0
  needUpdate = false

  constructor(config: ElogConfig) {
    // 初始化配置
    this.config = config
    // 初始化文章缓存配置
    this.articleCachePath = path.join(__cwd, config.articleCachePath || CACHE_FILE_NAME)
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
      this.lastGeneratePath = path.join(__cwd, config.lastGeneratePath || LAST_GENERATE_FILE_NAME)
      this.lastGenerate = Number(fs.readFileSync(this.lastGeneratePath).toString())
    } catch (error) {
      // out.warning('获取最后更新时间失败，可能会导致重复部署', error)
    }
  }

  /**
   * 初始化写作平台
   * @param config
   */
  initWritingPlatform(config: ElogConfig) {
    if (config.writing.platform === WritingPlatform.YUQUE) {
      let yuqueConfig = config.writing as YuqueConfig
      yuqueConfig.token = yuqueConfig.token || process.env.YUQUE_TOKEN!
      if (!yuqueConfig.token) {
        out.err('缺少参数', '缺少语雀Token')
        process.exit(-1)
      }
      this.downloaderClient = new Yuque(yuqueConfig)
    } else if (config.writing.platform === WritingPlatform.NOTION) {
      let notionConfig = config.writing as NotionConfig
      notionConfig.token = notionConfig.token || process.env.NOTION_TOKEN!
      if (!notionConfig.token) {
        out.err('缺少参数', '缺少Notion Token')
        process.exit(-1)
      }
      this.downloaderClient = new Notion(notionConfig)
    }
  }

  /**
   * 初始化部署平台
   * @param config
   */
  initDeployPlatform(config: ElogConfig) {
    if (config.deploy.platform === DeployPlatform.DEFAULT) {
      const deployOptions = config.deploy as DeployOptions
      deployOptions.lastGenerate = this.lastGenerate
      this.deployClient = new Deploy(deployOptions)
    } else if (config.deploy.platform === DeployPlatform.WORDPRESS) {
      // TODO wordpress
    } else {
      const deployOptions = config.deploy.platform as DeployOptions
      deployOptions.lastGenerate = this.lastGenerate
      this.deployClient = new Deploy(deployOptions)
    }
  }

  /**
   * 初始化图片转CDN配置
   * @param config
   */
  initImgCdn(config: ElogConfig) {
    if (config.image?.enable) {
      this.imgCdnClient = new ImgCdnClient(config.image)
    }
  }

  /**
   * 下载文章详情列表
   */
  async fetchArticles() {
    let articleList = (await this.downloaderClient.getDocList()) as Doc[]
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
    // 更新缓存里的文章
    for (const docDetail of docDetailList) {
      const { index, status } = idMap[docDetail.doc_id]
      if (status === DocStatus.create) {
        // 新增文章
        this.cachedArticles.push(docDetail)
      } else {
        // 更新文章
        this.cachedArticles[index!] = docDetail
      }
    }
  }

  /**
   * 读取语雀的文章缓存 json 文件
   */
  readArticleCache() {
    const { articleCachePath } = this
    try {
      const articles = require(articleCachePath)
      if (Array.isArray(articles)) {
        this.cachedArticles = articles
        return
      }
    } catch (error) {}
    this.cachedArticles = []
  }

  /**
   * 写入语雀的文章缓存 json 文件
   */
  writeArticleCache() {
    const { articleCachePath, cachedArticles } = this
    fs.writeFileSync(articleCachePath, JSON.stringify(cachedArticles, null, 2), {
      encoding: 'utf8',
    })
  }

  /**
   * 处理文章图片
   */
  async processImage(docDetailList: DocDetail[]) {
    return await this.imgCdnClient.replaceImages(docDetailList)
  }

  /**
   * 部署文章
   */
  async deployArticles() {
    await this.deployClient.deploy(this.cachedArticles)
  }

  // 文章下载 => 增量更新文章到缓存 json 文件
  async deploy() {
    // 读取文章缓存
    this.readArticleCache()
    // 下载文章
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
    // 更新增量更新时间
    fs.writeFileSync(this.lastGeneratePath!, new Date().getTime().toString())
    out.access('任务结束', '🎉更新成功🎉')
  }
}

export default Elog
