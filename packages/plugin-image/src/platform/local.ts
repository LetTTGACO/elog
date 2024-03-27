import { GetImagePath, ImgLocalConfig } from './types'
import * as fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import { out } from '@elog/shared'
import { DocDetail } from '@elog/types'
import { getImagePathExt } from './utils'

class LocalClient {
  config: ImgLocalConfig
  getImagePath: GetImagePath
  constructor(config: ImgLocalConfig) {
    this.config = config
    this.getImagePath = this.initImagePath()
  }

  initImagePath() {
    if (this.config.imagePathExt) {
      return getImagePathExt(this.config.imagePathExt)
    } else {
      return this.genImagePath
    }
  }

  genImagePath(doc: DocDetail, outputDir: string) {
    // const dirPath = path.resolve(process.cwd(), this.config.outputDir)
    const dirPath = outputDir
    let prefixKey = ''
    if (this.config.pathFollowDoc) {
      // 1.拿到当前文档的路径
      const docPath = doc.docPath as string
      // 2.拿到图片输出路径
      // 3.根据文档路径计算图片的相对路径
      // 假如文档路径为 ./docs/首页/首页下的文档.md
      // 图片输出路径为 ./docs/images
      // 图片前缀为../../images
      prefixKey = path.relative(docPath, dirPath)
    } else {
      prefixKey = this.config.prefixKey || '/'
    }
    return {
      dirPath,
      prefixKey,
    }
  }

  /**
   * 检查是否已经存在图片，存在则返回url,不存在返回undefined
   * TODO 为了性能，本地也需要维护一个文件的缓存MAP，这样不会重复进行文件查找和写入
   * TODO 当前阶段可以忽略检查本地文件是否存在，直接覆盖写入即可
   */
  async hasImage(): Promise<string | undefined> {
    return undefined
  }

  /**
   * 上传图片到图床
   * @param imgBuffer
   * @param imageName
   * @param doc
   */
  async uploadImg(
    imgBuffer: Buffer,
    imageName: string,
    doc: DocDetail,
  ): Promise<string | undefined> {
    try {
      let { dirPath, prefixKey } = this.getImagePath(doc, this.config.outputDir)
      if (!prefixKey.endsWith('/')) {
        prefixKey = prefixKey + '/'
      }
      const fullDirPath = path.resolve(process.cwd(), dirPath)
      mkdirp.sync(dirPath)
      const filePath = path.resolve(fullDirPath, imageName)
      fs.writeFileSync(filePath, imgBuffer)
      // 计算root和output的相对路径
      return path.join(prefixKey, imageName)
    } catch (e: any) {
      out.err('写入错误', e.message)
      out.debug(e)
    }
  }
}

export default LocalClient
