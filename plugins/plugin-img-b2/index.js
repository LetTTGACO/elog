const b2 = require('backblaze-b2')
class BackblazeB2 {
  config
  bucketId
  constructor(config) {
    this.config = config.b2
    this.b2Client = new b2({
      applicationKeyId: this.config.applicationKeyId,
      applicationKey: this.config.applicationKey,
    })
    this.promise = this.init()
  }

  async init() {
    await this.b2Client.authorize()
    const bucketRes = await this.b2Client.getBucket({ bucketName: this.config.bucket })
    this.bucketId = bucketRes.data.buckets[0].bucketId
  }

  async hasImage(fileName) {
    try {
      await this.promise
      const files = await this.b2Client.listFileNames({
        bucketId: this.bucketId,
        prefix: `${this.config.prefixKey}/${fileName}`,
        maxFileCount: 1,
      })

      if (files.data.files.length === 0) {
        return undefined
      }
      return `${this.config.host}/${files.data.files[0].fileName}`
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('错误', '请检查图床配置')
    }
  }

  async uploadImg(imgBuffer, fileName) {
    try {
      await this.promise
      const uploadUrl = await this.b2Client.getUploadUrl({
        bucketId: this.bucketId,
      })
      const file = await this.b2Client.uploadFile({
        uploadUrl: uploadUrl.data.uploadUrl,
        uploadAuthToken: uploadUrl.data.authorizationToken,
        fileName: `${this.config.prefixKey}/${fileName}`,
        data: imgBuffer,
      })
      return `${this.config.host}/${file.data.fileName}`
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('上传失败', e.message)
    }
  }
}
module.exports = BackblazeB2
