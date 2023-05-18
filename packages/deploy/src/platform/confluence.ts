import { out } from '@elog/shared'
import ConfluenceClient, { ConfluenceConfig, WikiMap } from '@elog/sdk-confluence'
import { DocDetail } from '@elog/types'
import { AdapterClient } from '../adapter'
import { AdapterFunction } from '../types'
import { FormatEnum } from '../const'

class DeployConfluence {
  config: ConfluenceConfig
  ctx: ConfluenceClient
  adapterClient: AdapterClient
  /** 文档处理适配器 */
  adapter: AdapterFunction

  constructor(config: ConfluenceConfig) {
    this.config = config
    this.ctx = new ConfluenceClient(config)
    this.adapterClient = new AdapterClient({ format: FormatEnum.WIKI, formatExt: config.formatExt })
    this.adapter = this.adapterClient.getAdapter()
  }

  async deploy(articleList: DocDetail[]) {
    out.access('正在部署到Confluence...')
    // 重新排序articleList，按照层级更新文章
    // 先更新第一级，再更新第二级...
    const sortArticleList = articleList.sort((a, b) => {
      if (!a.catalog || !b.catalog) {
        return 0
      }
      return a.catalog.length - b.catalog.length
    })
    // 获取rootPage下的文章列表
    const rootPageList = await this.ctx.getRootPageList()
    let rootPageMap: WikiMap = {}
    // List转Map
    rootPageList.forEach((item) => {
      rootPageMap[item.title] = item
    })
    // 根据目录上传到wiki上
    for (const articleInfo of sortArticleList) {
      // 将markdown转wiki
      const formatBody = this.adapter(articleInfo)
      if (typeof formatBody === 'object') {
        articleInfo.body_wiki = formatBody.body
      } else {
        articleInfo.body_wiki = formatBody
      }
      // 是否存在
      const cacheWikiPage = rootPageMap[articleInfo.properties.title]
      if (cacheWikiPage) {
        out.info('更新文档', cacheWikiPage.title)
        // 获取版本信息
        const updatingPage = await this.ctx.getPageById(cacheWikiPage.id)
        const version = updatingPage.version.number + 1
        await this.ctx.updatePage(articleInfo, cacheWikiPage.id, version)
      } else {
        out.info('新增文档', articleInfo.properties.title)
        // 新增
        // 在rootPageMap中找到parent title
        let parentId = ''
        const catalog = articleInfo.catalog
        if (catalog?.length) {
          const parentTitle = catalog[catalog.length - 1].title
          parentId = rootPageMap[parentTitle].id
        }
        // 直接新增
        // 如果有parentId就存在parentPage下，没有则存在空间的rootPage下
        try {
          const createdPage = await this.ctx.createPage(articleInfo, parentId)
          // 临时更新Map
          rootPageMap[createdPage.title] = createdPage
        } catch (e: any) {
          // 有可能是重名更新失败
          if (e.message.indexOf('A page with this title already exists') > -1) {
            out.err(
              '跳过部署',
              `文章标题已存在于confluence, 请检查: ${articleInfo.properties.title}`,
            )
          } else {
            out.err('跳过部署', e.message)
          }
        }
      }
    }
  }
}

export default DeployConfluence
