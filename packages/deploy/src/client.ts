import { DeployOptions, DocDetail } from './types'
import path from 'path'
import fs from 'fs'
import filenamify from 'filenamify'
import { markdownAdapter, matterMarkdownAdapter, wikiAdapter } from '@elog/plugin-adapter'
import { out } from '@elog/shared'
import mkdirp from 'mkdirp'
import ConfluenceClient from './confluence/client'
import { WikiMap } from './confluence/types'

/**
 * 部署器
 */
class Deploy {
  config: DeployOptions
  postBasicPath?: string
  cacheFileNames: string[] = []

  constructor(config: DeployOptions) {
    this.config = config
    if (config.postPath) {
      this.postBasicPath = path.join(process.cwd(), config.postPath)
    }
  }

  /**
   * 默认部署方式
   * @param post
   */
  async deployDefault(post: DocDetail) {
    if (post.updated < (this.config.lastGenerate || 0)) {
      out.access('跳过部署', post.properties.title)
      return
    }
    const { adapter = 'markdown', mdNameFormat = 'title' } = this.config
    const postBasicPath = this.config.postPath!
    const classifyName = this.config.classify
    let formatBody = ''

    if (adapter === 'matter-markdown') {
      formatBody = matterMarkdownAdapter(post)
    } else if (adapter === 'markdown') {
      formatBody = markdownAdapter(post)
    } else if (adapter === 'html') {
      // TODO HTML适配器
      // formatBody = await transform.htmlAdapter(post)
    } else {
      formatBody = markdownAdapter(post)
    }
    let fileName = filenamify(post.properties[mdNameFormat])

    let outdir: string
    // 分类文件夹
    let classify
    // 校验文件名重复的问题
    let checkName
    if (classifyName) {
      classify = post.properties[classifyName]
      // 说明需要按文件夹生成
      if (classify) {
        outdir = path.join(postBasicPath, classify)
        checkName = classify + fileName
        mkdirp.sync(outdir)
      } else {
        outdir = postBasicPath
        checkName = fileName
      }
    } else {
      outdir = postBasicPath
      checkName = fileName
    }
    fileName = this.checkFileName(checkName, fileName)
    const postPath = path.join(outdir, `${fileName}.md`)
    out.info('文件生成', classify ? `${classify}/${fileName}.md` : `${fileName}.md`)
    fs.writeFileSync(postPath, formatBody, {
      encoding: 'utf8',
    })
  }

  checkFileName(fileName: string, originName = '') {
    let newName: string
    if (this.cacheFileNames.includes(fileName)) {
      const newFileName = `${originName || fileName}_${new Date().getTime()}`
      out.warning('文件重复', `${fileName}.md文件重复，将为自动重命名为${newFileName}.md`)
      newName = newFileName
    } else {
      newName = originName
      this.cacheFileNames.push(fileName)
    }
    return newName
  }

  async deployWiki(articleList: DocDetail[]) {
    if (!this.config.confluence) {
      out.err('配置错误', 'confluence 配置缺失，请检查')
      process.exit(1)
    }
    out.access('正在部署到Confluence...')
    // 重新排序articleList，按照层级更新文章
    // 先更新第一级，再更新第二级...
    const sortArticleList = articleList.sort((a, b) => {
      if (!a.toc || !b.toc) {
        return 0
      }
      return a.toc.length - b.toc.length
    })
    const confluenceClient = new ConfluenceClient(this.config.confluence)
    // 获取rootPage下的文章列表
    const rootPageList = await confluenceClient.getRootPageList()
    let rootPageMap: WikiMap = {}
    // List转Map
    rootPageList.forEach((item) => {
      rootPageMap[item.title] = item
    })
    // 根据目录上传到wiki上
    for (const articleInfo of sortArticleList) {
      if (articleInfo.updated < (this.config.lastGenerate || 0)) {
        out.access('跳过部署', articleInfo.properties.title)
        break
      }
      // 将markdown转wiki
      articleInfo.body_wiki = wikiAdapter(articleInfo)
      // 是否存在
      const cacheWikiPage = rootPageMap[articleInfo.title]
      if (cacheWikiPage) {
        out.info('更新文章', cacheWikiPage.title)
        // 获取版本信息
        const updatingPage = await confluenceClient.getPageById(cacheWikiPage.id)
        const version = updatingPage.version.number + 1
        await confluenceClient.updatePage(articleInfo, cacheWikiPage.id, version)
      } else {
        out.info('新增文章', articleInfo.title)
        // 新增
        // 在rootPageMap中找到parent title
        let parentId = ''
        const toc = articleInfo.toc
        if (toc?.length) {
          const parentTitle = toc[toc.length - 1].title
          parentId = rootPageMap[parentTitle].id
        }
        // 直接新增
        // 如果有parentId就存在parentPage下，没有则存在空间的rootPage下
        try {
          const createdPage = await confluenceClient.createPage(articleInfo, parentId)
          // 临时更新Map
          rootPageMap[createdPage.title] = createdPage
        } catch (e: any) {
          // 有可能是重名更新失败
          if (e.message.indexOf('A page with this title already exists') > -1) {
            out.err('跳过部署', `文章标题已存在于confluence, 请检查: ${articleInfo.title}`)
          } else {
            out.err('跳过部署', e.message)
          }
        }
      }
    }
  }

  /**
   * 部署配置
   * @param articleList
   */
  async deploy(articleList: DocDetail[]) {
    if (this.config.platform === 'confluence') {
      await this.deployWiki(articleList)
    } else if (this.config.platform === 'default') {
      mkdirp.sync(this.postBasicPath!)
      for (const articleInfo of articleList) {
        // 在指定位置生成md文档
        await this.deployDefault(articleInfo)
      }
    }
  }
}

export default Deploy
