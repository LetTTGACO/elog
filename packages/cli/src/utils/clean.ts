import rimraf from 'rimraf'
import path from 'path'
import { out } from '@elog/shared'
import * as fs from 'fs'

const __cwd = process.cwd()

/**
 * 清理文章
 */
export const cleanPost = (postPath: string) => {
  try {
    const dist = path.join(__cwd, postPath)
    rimraf.sync(dist)
    out.info('清理成功', dist)
  } catch (error) {
    // @ts-ignore
    out.err('清理失败', error.message)
  }
}

/**
 * 清理文章缓存
 */
export const cleanCache = (cachePath: string) => {
  try {
    const dist = path.join(__cwd, cachePath)
    fs.unlinkSync(dist)
    out.info('清理成功', dist)
  } catch (error) {
    // @ts-ignore
    out.err('清理失败', error.message)
  }
}

/**
 * 清理本地图片
 */
export const cleanImages = (imgsPath: string) => {
  try {
    const dist = path.join(__cwd, imgsPath)
    rimraf.sync(dist)
    out.info('清理成功', dist)
  } catch (error) {
    // @ts-ignore
    out.err('清理失败', error.message)
  }
}
