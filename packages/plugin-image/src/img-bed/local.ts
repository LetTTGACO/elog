import { LocalConfig } from './types'
import * as fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import { out } from '@elog/shared'

class CosClient {
  config: LocalConfig
  constructor(config: LocalConfig) {
    this.config = config
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
   * @param fileName
   */
  async uploadImg(imgBuffer: Buffer, fileName: string): Promise<string | undefined> {
    try {
      // 将文件写入本地
      // 文件路径
      const dirPath = path.resolve(process.cwd(), this.config.outputDir)
      mkdirp.sync(dirPath)
      const filePath = path.resolve(dirPath, fileName)
      fs.writeFileSync(filePath, imgBuffer)
      let prefixKey = this.config.prefixKey || '/'
      if (!prefixKey.endsWith('/')) {
        prefixKey = prefixKey + '/'
      }
      // 计算root和output的相对路径
      return prefixKey + fileName
    } catch (e) {
      // @ts-ignore
      out.err('写入错误', e.message)
    }
  }
}

export default CosClient
