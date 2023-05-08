import filenamify from 'filenamify'
import path from 'path'
import mkdirp from 'mkdirp'
import { out } from '@elog/shared'
import fs from 'fs'
import { AdapterFunction, LocalConfig } from '../types'
import { FileNameEnum, fileNameList } from '../const'
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
    this.adapterClient = new AdapterClient({ format: config.format, formatExt: config.formatExt })
    this.adapter = this.adapterClient.getAdapter()
  }

  /**
   * 本地部署
   * @param articleList
   */
  async deploy(articleList: DocDetail[]) {
    let { filename = FileNameEnum.TITLE } = this.config
    if (!fileNameList.includes(filename)) {
      filename = FileNameEnum.TITLE
      out.warning(
        '配置错误',
        `文件命名方式目前只支持${fileNameList.toString()}，将默认以title形式命名`,
      )
    }
    const outputDir = path.join(process.cwd(), this.config.outputDir)

    for (const post of articleList) {
      let formatBody = this.adapter(post)
      let fileName = filenamify(post.properties[filename])
      let postPath: string
      if (this.config.catalog) {
        // 开启按目录生成
        if (Array.isArray(post.catalog)) {
          // 是否存在目录
          // NOTE 目前只有语雀返回了这个目录信息
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
      fs.writeFileSync(postPath, formatBody, {
        encoding: 'utf8',
      })
    }
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
