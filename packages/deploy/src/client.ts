import { DeployOptions, DocDetail } from './types'
import path from 'path'
import fs from 'fs'
import filenamify from 'filenamify'
import { markdownAdapter, matterMarkdownAdapter, wikiAdapter } from '@elog/plugin-adapter'
import { out } from '@elog/shared'
import mkdirp from 'mkdirp'
import WikiClient from './wiki/client'
import { WikiMap } from './wiki/types'

/**
 * 部署器
 */
class Deploy {
  config: DeployOptions
  postBasicPath: string
  cacheFileNames: string[] = []

  constructor(config: DeployOptions) {
    this.config = config
    this.postBasicPath = path.join(process.cwd(), config.postPath)
  }

  async generatePost(post: DocDetail) {
    const classifyName = this.config.classify
    if (post.updated < (this.config.lastGenerate || 0)) {
      out.access('跳过部署', post.properties.title)
      return
    }
    const { postPath: postBasicPath, adapter = 'markdown', mdNameFormat = 'title' } = this.config
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
    if (!this.config.wiki) {
      out.err('配置错误', 'confluence 配置缺失，请检查')
      process.exit(1)
    }
    // 重新排序articleList，按照层级更新文章
    // 先更新第一级，再更新第二级...
    const sortArticleList = articleList.sort((a, b) => {
      return a.toc!.length - b.toc!.length
    })

    const wiki = new WikiClient(this.config.wiki)
    // 获取rootPage下的文章列表
    const rootPageList = await wiki.getRootPageList()
    let rootPageMap: WikiMap = {}
    // List转Map
    rootPageList.forEach((item) => {
      rootPageMap[item.title] = item
    })
    // 根据目录上传到wiki上
    for (const articleInfo of sortArticleList) {
      // 将markdown转wiki
      articleInfo.body_wiki = wikiAdapter(articleInfo)
      // 是否存在
      const cacheWikiPage = rootPageMap[articleInfo.title]
      if (cacheWikiPage) {
        // 获取版本信息
        const updatingPage = await wiki.getPageById(cacheWikiPage.id)
        const version = updatingPage.version.number + 1
        await wiki.updatePage(articleInfo, cacheWikiPage.id, version)
      } else {
        // 新增
        // 在rootPageMap中找到parent title
        let parentId = ''
        const toc = articleInfo.toc!
        if (toc.length) {
          const parentTitle = toc[toc.length - 1].title
          parentId = rootPageMap[parentTitle].id
        }
        // 直接新增
        // 如果有parentId就存在parentPage下，没有则存在空间的rootPage下
        const createdPage = await wiki.createPage(articleInfo, parentId)
        // 临时更新Map
        rootPageMap[createdPage.title] = createdPage
      }
    }
  }

  /**
   * 部署配置
   * @param articleList
   */
  async deploy(articleList: DocDetail[]) {
    if (this.config.adapter === 'wiki') {
      return this.deployWiki(articleList)
    }
    mkdirp.sync(this.postBasicPath)
    for (const articleInfo of articleList) {
      // 在指定位置生成md文档
      await this.generatePost(articleInfo)
    }
  }
}

export default Deploy
