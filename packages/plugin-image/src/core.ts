import ImgClient from './platform'
import { ImageConfig } from './platform/types'
import {
  generateUniqueId,
  getFileType,
  getPicBufferFromURL,
  getUrlListFromContent,
  ImageFail,
  out,
} from '@elog/shared'
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
   * 上传
   * @param urlList
   * @param doc
   * @param failBack
   */
  async upload(urlList: ImageUrl[], doc: DocDetail, failBack?: (image: ImageUrl) => void) {
    const toUploadURLs = urlList.map(async (image) => {
      return await new Promise<ImageSource | undefined>(async (resolve) => {
        try {
          // 生成文件名
          const fileName = generateUniqueId(image.url)
          // 生成文件名后缀
          const fileType = getFileType(image.url)
          if (!fileType) {
            out.warning(`获取图片类型失败，跳过：${image.url}`)
            resolve(undefined)
            return
          }
          // 完整文件名
          const fullName = `${fileName}.${fileType.type}`
          out.info('处理图片', `生成文件名: ${fullName}`)
          // 检查图床是否存在该文件
          let exist = await this.ctx.hasImage(fullName)
          if (exist) {
            out.info('忽略上传', `图片已存在: ${exist}`)
            // 图片已存在
            resolve({
              fileName: fullName,
              original: image.original,
              url: exist,
              upload: false,
            })
          } else {
            const buffer = await getPicBufferFromURL(image.original)
            if (!buffer) {
              failBack?.(image)
              resolve(undefined)
              return
            }
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
        newUrl = await this.ctx.uploadImg(img.buffer!, img.fileName, doc)
        if (newUrl) {
          if (this.config.platform === ImagePlatformEnum.LOCAL) {
            out.info('生成图片', newUrl)
          } else {
            out.info('上传成功', newUrl)
          }
          output.push({ original: img.original, url: newUrl })
        } else {
          out.warning('上传失败：' + img.fileName + ' 请检查图床配置')
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
        const urls = await this.upload(urlList, articleInfo, () => {
          articleInfo.needUpdate = ImageFail
        })
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

  /**
   * 从飞书下载图片
   * @param articleList
   * @param feishuClient
   * @param doc
   */

  async replaceImagesFromFeiShu(articleList: DocDetail[], feishuClient: any, doc: DocDetail) {
    // 遍历文章列表
    for (let i = 0; i < articleList.length; i++) {
      const articleInfo = articleList[i]
      // 获取图片URL列表
      const urlList = getUrlListFromContent(articleInfo.body)
      if (urlList.length) {
        // 上传图片
        const urls = await this.uploadFromFeiShu(urlList, feishuClient, doc, () => {
          articleInfo.needUpdate = ImageFail
        })
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
  async uploadFromFeiShu(
    urlList: ImageUrl[],
    feishuClient: any,
    doc: DocDetail,
    failBack?: (image: ImageUrl) => void,
  ) {
    const toUploadURLs = urlList.map(async (image) => {
      return await new Promise<ImageSource | undefined>(async (resolve) => {
        try {
          // 从飞书下载图片
          const res = await feishuClient.getResourceItem(image.url)
          // 完整文件名
          const fullName = res.name
          out.info('处理图片', `生成文件名: ${fullName}`)
          // 检查图床是否存在该文件
          let exist = await this.ctx.hasImage(fullName)
          if (exist) {
            out.info('忽略上传', `图片已存在: ${exist}`)
            // 图片已存在
            resolve({
              fileName: fullName,
              original: image.original,
              url: exist,
              upload: false,
            })
          } else {
            const buffer = res.buffer
            if (!buffer) {
              failBack?.(image)
              resolve(undefined)
              return
            }
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
        newUrl = await this.ctx.uploadImg(img.buffer!, img.fileName, doc)
        if (newUrl) {
          if (this.config.platform === ImagePlatformEnum.LOCAL) {
            out.info('生成图片', newUrl)
          } else {
            out.info('上传成功', newUrl)
          }
          output.push({ original: img.original, url: newUrl })
        } else {
          out.warning('上传失败：' + img.fileName + ' 请检查图床配置')
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
}

export default ImageUploader
