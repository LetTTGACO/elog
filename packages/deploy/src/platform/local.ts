import filenamify from 'filenamify'
import path from 'path'
import mkdirp from 'mkdirp'
import { out, isTime, timeFormat } from '@elog/shared'
import fs from 'fs'
import { AdapterFunction, LocalConfig } from '../types'
import { FileNameEnum, FormatEnum } from '../const'
import { DocDetail } from '@elog/types'
import { AdapterClient } from '../adapter'

class DeployLocal {
  config: LocalConfig
  cacheFileNames: string[] = []
  adapterClient: AdapterClient
  /** 文档处理适配器 */
  adapter: AdapterFunction

  constructor(config: LocalConfig) {
    this.config = config
    this.adapterClient = new AdapterClient({
      format: config.format,
      frontMatter: config.frontMatter,
      formatExt: config.formatExt,
    })
    this.adapter = this.adapterClient.getAdapter()
  }

  /**
   * 过滤 Front-Matter
   * @param post
   * @param filename
   */
  filterFrontMatter(post: DocDetail, filename: string) {
    // 时间格式化
    const formatTime = (format?: string) => {
      Object.keys(post.properties).forEach((key) => {
        const value = post.properties[key]
        if (isTime(value)) {
          post.properties[key] = timeFormat(value, frontMatter?.timezone, format)
        }
      })
    }
    const frontMatter = this.config.frontMatter
    if (frontMatter?.enable) {
      if (this.config.frontMatter?.include?.length) {
        Object.keys(post.properties).forEach((item: string) => {
          // 过滤不需要的属性
          if (!this.config.frontMatter?.include?.includes(item)) {
            if (item !== filename) {
              delete post.properties[item]
            }
          }
        })
      }
      if (frontMatter?.exclude?.length) {
        Object.keys(post.properties).forEach((item: string) => {
          if (this.config.frontMatter?.exclude?.includes(item)) {
            if (item !== filename) {
              delete post.properties[item]
            }
          }
        })
      }
      if (frontMatter.timeFormat) {
        // 是否开启时间格式化
        if (typeof frontMatter.timeFormat === 'boolean') {
          // 默认以 YYYY-MM-DD HH:mm:ss 格式化
          formatTime('YYYY-MM-DD HH:mm:ss')
        }
        if (typeof frontMatter?.timeFormat === 'string') {
          formatTime(frontMatter.timeFormat)
        }
      }
    } else {
      // NOTE 兼容性配置，兼容低版本，将时间重新格式化，下个 breaking changes 版本删除
      if (this.config.format === FormatEnum.MATTER_MARKDOWN) {
        // 默认以 YYYY-MM-DD HH:mm:ss 格式化
        formatTime('YYYY-MM-DD HH:mm:ss')
      }
    }
  }

  /**
   * 本地部署
   * @param articleList
   * @param imageClient
   */
  async deploy(articleList: DocDetail[], imageClient?: any) {
    let { filename = FileNameEnum.TITLE } = this.config
    const outputDir = path.join(process.cwd(), this.config.outputDir)

    for (let post of articleList) {
      this.filterFrontMatter(post, filename)
      let formatRes = await this.adapter(post, imageClient)
      let body = ''

      if (typeof formatRes === 'string') {
        /** @deprecated 兼容处理，将在 1.0 版本移除 */
        body = formatRes
      } else {
        // DocDetail 类型
        body = formatRes.body
        post = formatRes
      }

      let fileName = filenamify(post.properties[filename])
      if (!fileName) {
        // 没有文件名的文档
        out.warning(`存在未命名文档，将自动重命名为【未命名文档_${post.doc_id}】`)
        fileName = `未命名文档_${post.doc_id}`
      }
      let postPath: string
      if (this.config.catalog) {
        // 开启按目录生成
        if (Array.isArray(post.catalog)) {
          // 是否存在目录
          const tocPath = post.catalog.map((item) => item.title).join('/')
          fileName = this.checkFileName(fileName + tocPath, fileName, post.doc_id)
          const outdir = path.join(outputDir, tocPath)
          mkdirp.sync(outdir)
          postPath = path.join(outdir, `${fileName}.md`)
          // 生成文件夹
          out.info('生成文档', `${fileName}.md`)
        } else {
          out.warning('目录缺失', `${fileName}缺失目录信息，将生成在指定目录`)
          // 不存在则直接生成
          fileName = this.checkFileName(fileName, fileName, post.doc_id)
          postPath = path.join(outputDir, `${fileName}.md`)
          out.info('生成文档', `${fileName}.md`)
          mkdirp.sync(outputDir)
        }
      } else {
        // 直接生成
        fileName = this.checkFileName(fileName, fileName, post.doc_id)
        postPath = path.join(outputDir, `${fileName}.md`)
        out.info('生成文档', `${fileName}.md`)
        mkdirp.sync(outputDir)
      }
      fs.writeFileSync(postPath, body, {
        encoding: 'utf8',
      })
      // 真正的文件名
      post.realName = fileName
      // 删除outputDir之后的postPath
      post.relativePath = postPath.replace(outputDir, '')
    }
    return articleList
  }

  /**
   * 检查文件名
   * @param fileName
   * @param originName
   * @param doc_id
   */
  checkFileName(fileName: string, originName: string, doc_id: string) {
    let newName: string
    if (this.cacheFileNames.includes(fileName)) {
      const newFileName = `${originName}_${doc_id}`
      out.warning('文档重复', `${originName}.md文档已存在，将为自动重命名为${newFileName}.md`)
      newName = newFileName
    } else {
      newName = originName
      this.cacheFileNames.push(fileName)
    }
    return newName
  }
}

export default DeployLocal
