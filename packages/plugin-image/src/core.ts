import { ArticleInfo } from './types'
import { getFileName, getFileType, getUrlListFromContent } from './utils'
import ImgClient from './img-bed'
import { ImgBedEnum, ImgConfig } from './img-bed/types'
import axios from 'axios'
import { out } from '@elog/shared'

class ImageUploader {
  config: ImgConfig
  ctx: ImgClient

  constructor(config: any) {
    this.config = config
    this.ctx = new ImgClient(config)
  }

  /**
   * 获取图片buffer
   */
  async getPicBufferFromURL(url: string) {
    try {
      const res = await axios.request({
        url,
        responseType: 'arraybuffer',
      })
      return res.data
    } catch (e) {
      out.warning('下载失败', `图片下载失败: ${url}`)
    }
  }

  /**
   * 上传
   * @param urlList
   */
  async upload(urlList: string[]) {
    const toUploadURLs = urlList.map(async (url) => {
      // eslint-disable-next-line no-async-promise-executor
      return await new Promise(async (resolve): Promise<any> => {
        try {
          const buffer = await this.getPicBufferFromURL(url)
          // 生成文件名
          const fileName = await getFileName(buffer)
          // 生成文件名后缀
          const fileType = getFileType(url, buffer)
          // 获取文件名
          const fullName = `${fileName}.${fileType.type}`
          out.info('处理图片', `生成文件名: ${fullName}`)
          // 检查图床是否存在该文件
          let exist = await this.ctx.hasImage(fullName)
          if (exist) {
            out.access('忽略上传', exist)
            // 图片已存在
            resolve({
              fileName: fullName,
              origin: url,
              newUrl: exist,
              upload: false,
            })
          } else {
            // 上传图片
            resolve({
              buffer,
              fileName: fullName,
              origin: url,
              upload: true,
            })
          }
        } catch (err: any) {
          resolve(undefined)
        }
      })
    })
    const toUploadImgs = await Promise.all(toUploadURLs).then((imgs) =>
      imgs.filter((img) => img !== undefined),
    )
    let output: any[] = []

    for (const img of toUploadImgs as any[]) {
      let newUrl: string | undefined = ''
      if (img.upload) {
        newUrl = await this.ctx.uploadImg(img.buffer, img.fileName)
        if (newUrl) {
          if (this.config.bed === ImgBedEnum.LOCAL) {
            out.access('生成图片', newUrl)
          } else {
            out.access('上传成功', newUrl)
          }
          output.push({ original: img.origin, newUrl: newUrl })
        }
      } else {
        output.push({ original: img.origin, newUrl: img.newUrl })
      }
    }
    if (output.length) {
      output
        .filter((item) => item.newUrl && item.newUrl !== item.origin)
        .map((item) => {
          return {
            original: item.origin,
            newUrl: item.newUrl,
          }
        })
      return output
    }
  }

  /**
   * 替换图片
   * @param articleList
   */
  async replaceImages(articleList: ArticleInfo[]) {
    // 遍历文章列表
    for (let i = 0; i < articleList.length; i++) {
      const articleInfo = articleList[i]
      // 获取图片URL列表
      const urlList = getUrlListFromContent(articleInfo.body)
      if (urlList.length) {
        // 上传图片
        const urls = await this.upload(urlList)
        if (urls?.length) {
          // 替换文章中的图片
          urls.forEach((item) => {
            out.info('图片替换', `${item.original} => ${item.newUrl}`)
            articleInfo.body = articleInfo.body.replace(item.original, item.newUrl)
          })
        }
      }
    }
    return articleList
  }
}

export default ImageUploader
