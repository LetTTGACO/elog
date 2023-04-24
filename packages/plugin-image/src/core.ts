import { getFileName, getFileType, getUrlListFromContent } from './utils'
import ImgClient from './platform'
import { ImageConfig } from './platform/types'
import { out, request } from '@elog/shared'
import { DocDetail } from '@elog/types'
import { ImagePlatformEnum } from './platform/const'
import { ImageSource, ImageUrl } from './types'

class ImageUploader {
  config: ImageConfig
  ctx: ImgClient

  constructor(config: ImageConfig) {
    this.config = config
    this.ctx = new ImgClient(config)
  }

  /**
   * 获取图片buffer
   */
  async getPicBufferFromURL(url: string) {
    try {
      const res = await request<Buffer>(url, {
        dataType: 'arraybuffer',
      })
      out.access('下载成功', `图片下载成功: ${url}`)
      return res.data
    } catch (e: any) {
      out.warning('下载失败', `图片下载失败: ${url}，错误信息：${e.message}`)
    }
  }

  /**
   * 上传
   * @param urlList
   */
  async upload(urlList: ImageUrl[]) {
    const toUploadURLs = urlList.map(async (image) => {
      return await new Promise<ImageSource | undefined>(async (resolve) => {
        try {
          const buffer = await this.getPicBufferFromURL(image.original)
          if (!buffer) {
            resolve(undefined)
            return
          }
          // 生成文件名
          const fileName = await getFileName(buffer)
          // 生成文件名后缀
          const fileType = getFileType(image.url, buffer)
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
              original: image.original,
              url: exist,
              upload: false,
            })
          } else {
            // 上传图片
            resolve({
              buffer,
              fileName: fullName,
              original: image.original,
              upload: true,
            })
          }
        } catch (err: any) {
          resolve(undefined)
        }
      })
    })
    const toUploadImgs = (await Promise.all(toUploadURLs).then((imgs) =>
      imgs.filter((img) => img !== undefined),
    )) as ImageSource[]
    let output: ImageUrl[] = []

    for (const img of toUploadImgs) {
      let newUrl: string | undefined = ''
      if (img.upload) {
        newUrl = await this.ctx.uploadImg(img.buffer!, img.fileName)
        if (newUrl) {
          if (this.config.platform === ImagePlatformEnum.LOCAL) {
            out.access('生成图片', newUrl)
          } else {
            out.access('上传成功', newUrl)
          }
          output.push({ original: img.original, url: newUrl })
        }
      } else {
        output.push({ original: img.original, url: img.url! })
      }
    }
    if (output.length) {
      output
        .filter((item) => item.url && item.url !== item.original)
        .map((item) => {
          return {
            original: item.original,
            url: item.url,
          }
        })
      return output
    }
  }

  /**
   * 替换图片
   * @param articleList
   */
  async replaceImages(articleList: DocDetail[]) {
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
            out.info('图片替换', `${item.url}`)
            articleInfo.body = articleInfo.body.replace(item.original, item.url)
          })
        }
      }
    }
    return articleList
  }
}

export default ImageUploader
