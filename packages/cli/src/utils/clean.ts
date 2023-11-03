import path from 'path'
import { out } from '@elog/shared'
import fsExtra from 'fs-extra'
import { DocDetail } from '@elog/types'
const __cwd = process.cwd()

/**
 * 清理文章
 */
export const cleanPost = (postPath: string, cachePath: string) => {
  try {
    const cacheFilePath = path.join(__cwd, cachePath)
    if (!fsExtra.pathExistsSync(cacheFilePath)) {
      const dist = path.join(__cwd, postPath)
      if (!fsExtra.pathExistsSync(dist)) {
        out.warning('清理文档', `${dist} 路径不存在，无需清理`)
        return
      }
      out.warning('注意', `缓存文件 ${cacheFilePath} 不存在，将清除文档输出文件夹`)
      fsExtra.remove(dist, (error) => {
        if (error) {
          out.err(`清理文档失败: ${error.message}`)
        } else {
          out.info('清理文档', dist)
        }
      })
      return
    }
    const cacheJson = require(cacheFilePath)
    const docs = cacheJson.docs as DocDetail[]
    const dirList: string[] = []
    docs.forEach((doc) => {
      const docPath = doc.docPath as string
      const docDirPath = path.join(__cwd, docPath)
      if (!dirList.includes(docDirPath)) {
        fsExtra.remove(docDirPath, (error) => {
          if (error) {
            out.warning(`清理文档失败: ${error.message}`)
          }
          out.info('清理文档', docDirPath)
        })
        dirList.push(docDirPath)
      }
    })
  } catch (error: any) {
    out.warning(`清理文档失败, ${error.message}`)
  }
}

/**
 * 清理文章缓存
 */
export const cleanCache = (cachePath: string) => {
  try {
    const dist = path.join(__cwd, cachePath)
    if (!fsExtra.pathExistsSync(dist)) {
      out.warning('清理缓存', `${dist} 路径不存在，无需清理`)
      return
    }
    fsExtra.remove(dist, (error) => {
      if (error) {
        out.warning(`清理缓存失败: ${error.message}`)
      } else {
        out.info('清理缓存', dist)
      }
    })
  } catch (error: any) {
    out.warning(`清理缓存失败', ${error.message}`)
  }
}

/**
 * 清理本地图片
 */
export const cleanImages = (imgsPath: string) => {
  try {
    const dist = path.join(__cwd, imgsPath)
    if (!fsExtra.pathExistsSync(dist)) {
      out.warning('清理图片', `${dist} 路径不存在，无需清理`)
      return
    }
    fsExtra.remove(dist, (error) => {
      if (error) {
        out.warning(`清理图片失败: ${error.message}`)
      } else {
        out.info('清理图片', dist)
      }
    })
  } catch (error: any) {
    out.warning(`清理图片失败, ${error.message}`)
  }
}
