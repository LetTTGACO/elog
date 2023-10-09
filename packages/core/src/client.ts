// write
import {
  YuqueWithToken,
  YuqueWithTokenConfig,
  YuqueWithPwd,
  YuqueWithPwdConfig,
} from '@elog/sdk-yuque'
import NotionClient, { NotionConfig } from '@elog/sdk-notion'
import FlowUsClient, { FlowUsConfig } from '@elog/sdk-flowus'
import FeiShuClient, { FeiShuConfig } from '@elog/sdk-feishu'
// deploy
import DeployClient, { DeployConfig, DeployPlatformEnum } from '@elog/deploy'
// imageClient
import ImageClient from '@elog/plugin-image'
// types
import { ElogConfig, CacheJSON, DocStatusMap } from './types'
import { BaseDoc, DocDetail } from '@elog/types'
// const
import { WritePlatform, DocStatus } from './const'
// utils
import { out, ImageFail } from '@elog/shared'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 处理器
 */
class Elog {
  /** 配置文件 */
  config: ElogConfig
  /** 下载器 */
  downloaderClient: YuqueWithToken | YuqueWithPwd | NotionClient | FlowUsClient | FeiShuClient
  /** 部署器 */
  deployClient: DeployClient
  /** 图片转CDN转换器 */
  imageClient: any
  /** 缓存文章 */
  cachedArticles: DocDetail[] = []
  /** 是否需要更新，当所有文章都不需要更新，这个标记就会阻止后续流程 */
  needUpdate = false
  /** 待更新的文章列表 */
  needUpdateArticles: DocDetail[] = []
  /** 废弃文档 */
  wasteArticles: DocDetail[] = []

  constructor(config: ElogConfig) {
    // 初始化配置
    this.config = config
    // 初始化增量配置
    this.initIncrementalUpdate(config)
    // 初始化写作平台
    this.downloaderClient = this.initWritingPlatform(config)
    // 初始化部署平台
    this.deployClient = this.initDeployPlatform(config)
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
      out.access('全量更新', '未获取到缓存，将全量更新文档')
    }
    if (this.config.extension?.isForced) {
      out.warning('注意', '已开启强制同步，将按照当前配置找出需要删除的文档并删除')
    }
  }

  /**
   * 初始化写作平台
   * @param config
   */
  initWritingPlatform(config: ElogConfig) {
    if (config.write.platform === WritePlatform.YUQUE) {
      let yuqueConfig = config.write.yuque as YuqueWithTokenConfig
      return new YuqueWithToken(yuqueConfig)
    } else if (config.write.platform === WritePlatform.YUQUE_WITH_PWD) {
      let yuqueConfig = config.write['yuque-pwd'] as YuqueWithPwdConfig
      return new YuqueWithPwd(yuqueConfig)
    } else if (config.write.platform === WritePlatform.NOTION) {
      let notionConfig = config.write.notion as NotionConfig
      return new NotionClient(notionConfig)
    } else if (config.write.platform === WritePlatform.FLOWUS) {
      let flowusConfig = config.write.flowus as FlowUsConfig
      return new FlowUsClient(flowusConfig)
    } else if (config.write.platform === WritePlatform.FEISHU) {
      let feiShuConfig = config.write.feishu as FeiShuConfig
      return new FeiShuClient(feiShuConfig)
    } else {
      out.err('错误', '未知的写作平台')
      process.exit(0)
    }
  }

  /**
   * 初始化部署平台
   * @param config
   */
  initDeployPlatform(config: ElogConfig) {
    const deployOptions = config.deploy as DeployConfig
    return new DeployClient(deployOptions)
  }

  /**
   * 初始化图片转CDN配置
   * @param config
   */
  initImgCdn(config: ElogConfig) {
    if (config.image?.enable) {
      if (config.write.platform === WritePlatform.FLOWUS) {
        // FlowUs对图片的下载有referer限制
        // 所以需要在下载图片的时候加上referer=https://flowus.cn/
        // 这里使用过环境变量的方式添加
        process.env.REFERER_URL = 'https://flowus.cn/'
      }
      this.imageClient = new ImageClient(config.image)
    }
  }

  /**
   * 下载文章详情列表
   */
  async fetchArticles() {
    if (this.config.write.platform === WritePlatform.YUQUE_WITH_PWD) {
      const client = this.downloaderClient as YuqueWithPwd
      await client.login()
    }
    let articleList = (await this.downloaderClient.getDocList()) as BaseDoc[]
    if (!articleList?.length) {
      this.needUpdate = false
      return
    }
    // 过滤掉被删除的文章
    this.cachedArticles = this.cachedArticles.filter((cache) => {
      const isExist = articleList.findIndex((item) => item.doc_id === cache.doc_id) !== -1
      if (!isExist && this.config.extension?.isForced) {
        // 记录被删除/改名的文档
        this.wasteArticles.push(cache)
        out.warning(`${cache.properties.title} 文档已被删除，将在同步结束后处理`)
      }
      return isExist
    })
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

        if (cacheArticle.needUpdate === ImageFail) {
          out.access(
            `上次同步时 【${cacheArticle.properties.title}】 存在图片下载失败，本次将尝试重新同步`,
          )
        }
        if (!cacheAvailable || cacheArticle.needUpdate === ImageFail) {
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
      out.access('开始处理图片...')
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
        this.cachedArticles[index as number] = docDetail
      }
    }
  }

  /**
   * 写入缓存 json 文件
   */
  writeArticleCache() {
    try {
      let catalog: any[] = []
      if (
        this.config.write.platform === WritePlatform.YUQUE ||
        this.config.write.platform === WritePlatform.YUQUE_WITH_PWD
      ) {
        const yuqueClient = this.downloaderClient
        catalog = yuqueClient.ctx.catalog
      } else if (this.config.write.platform === WritePlatform.NOTION) {
        const notionClient = this.downloaderClient as NotionClient
        catalog = notionClient.ctx.catalog
      } else if (this.config.write.platform === WritePlatform.FLOWUS) {
        const flowusClient = this.downloaderClient as FlowUsClient
        catalog = flowusClient.ctx.catalog
      } else if (this.config.write.platform === WritePlatform.FEISHU) {
        const feiShuClient = this.downloaderClient as FeiShuClient
        catalog = feiShuClient.ctx.catalog
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
          realName: item.realName,
          relativePath: item.relativePath,
          needUpdate: item.needUpdate,
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
      out.warning('缓存失败', `写入缓存信息失败，请检查，${e.message}`)
      out.debug(e)
    }
  }

  /**
   * 处理文章图片
   */
  async processImage(docDetailList: DocDetail[]) {
    if (this.config.write.platform === WritePlatform.FEISHU) {
      // 飞书的图片资源需要单独处理
      return this.imageClient.replaceImagesFromFeiShu(
        docDetailList,
        (this.downloaderClient as FeiShuClient).ctx.feishu,
      )
    }
    return this.imageClient.replaceImages(docDetailList)
  }

  /**
   * 部署文章
   */
  async deployArticles() {
    return this.deployClient.deploy(this.needUpdateArticles)
  }

  /**
   * 强制同步
   * 仅适用于想让线上和本地文档保持强一致
   * 例如：线上文档改名/删除后，本地旧文档也想要同步删除
   */
  syncForced() {
    if (
      this.wasteArticles?.length &&
      this.cachedArticles?.length &&
      this.config.deploy.platform === DeployPlatformEnum.LOCAL
    ) {
      out.warning('文档强制同步中...')
      // 本地文档路径
      const outputDir = path.join(process.cwd(), this.config.deploy.local.outputDir)
      // 将本地文档路径下的文档根据废弃文档列表进行删除
      for (const wasteArticle of this.wasteArticles) {
        let deleteItem = wasteArticle
        if (!deleteItem.relativePath || !deleteItem.realName) {
          continue
        }
        const docPath = path.join(outputDir, deleteItem.relativePath)
        if (fs.existsSync(docPath)) {
          fs.unlinkSync(docPath)
          out.info('删除文档', `${wasteArticle.realName}.md`)
        }
      }
      return true
    }
    return false
  }

  // 下载文档 => 增量更新文章到缓存 json 文件
  async deploy() {
    // 下载文档
    await this.fetchArticles()
    if (!this.needUpdate) {
      const isNeedSyncForce = this.syncForced()
      this.writeArticleCache()
      // 结束进程
      if (isNeedSyncForce) {
        out.access('任务结束', '🎉 同步成功！ 🎉')
      } else {
        out.access('任务结束', '没有需要同步的文档')
      }
      return
    }
    // 部署文章
    const realArticles = await this.deployArticles()
    if (realArticles?.length) {
      // 将this.cachedArticles中的文章替换成realArticles中的文章
      this.cachedArticles = this.cachedArticles.map((item) => {
        const realArticle = realArticles.find((realItem) => realItem.doc_id === item.doc_id)
        if (realArticle) {
          return realArticle
        }
        return item
      })
    }
    // 删除本地不存在的文章
    this.syncForced()
    // 写入文章缓存
    this.writeArticleCache()
    out.access('任务结束', '🎉 同步成功！ 🎉')
  }
}

export default Elog
