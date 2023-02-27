import { DeployOptions, DocDetail } from './types'
import path from 'path'
import fs from 'fs'
import filenamify from 'filenamify'
import { markdownAdapter, matterMarkdownAdapter, wikiAdapter } from '@elog/plugin-adapter'
import { out } from '@elog/shared'
import mkdirp from 'mkdirp'

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
    } else if (adapter === 'wiki') {
      formatBody = wikiAdapter(post)
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

  /**
   * 部署配置
   * @param articleList
   */
  async deploy(articleList: DocDetail[]) {
    mkdirp.sync(this.postBasicPath)
    for (const articleInfo of articleList) {
      // 在指定位置生成md文档
      await this.generatePost(articleInfo)
    }
  }
}

export default Deploy
