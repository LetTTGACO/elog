const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

/**
 * 处理前缀，结尾自动加上/
 * @param prefix
 * @return {*|string}
 */
const formattedPrefix = (prefix) => {
  // 如果没传，则默认为空
  if (!prefix) return ''
  let _prefix = prefix
  // 如果开头无需/
  if (_prefix.startsWith('/')) {
    _prefix = _prefix.slice(1)
  }
  // 如果结尾需要/
  if (!_prefix.endsWith('/')) {
    _prefix = `${_prefix}/`
  }
  return _prefix
}

/**
 * 上传到cloudflare的 R2图床
 */
class R2Uploader {
  constructor(config) {
    this.config = config.r2
    this.config.prefixKey = formattedPrefix(this.config.prefixKey)
    this.s3Client = new S3Client({
      region: this.config.region || 'auto',
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    })
  }

  async hasImage(fileName) {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: this.config.prefixKey + fileName,
        }),
      )
      return `https://${this.config.host}/${this.config.prefixKey + fileName}`
    } catch (err) {
      if (err.name === 'NotFound') {
        return undefined
      }
      // eslint-disable-next-line no-console
      console.error('错误', err.message)
    }
  }

  async uploadImg(imgBuffer, fileName) {
    try {
      const params = {
        Bucket: this.config.bucket,
        Key: this.config.prefixKey + fileName,
        Body: imgBuffer,
      }
      await this.s3Client.send(new PutObjectCommand(params))
      return `https://${this.config.host}/${this.config.prefixKey + fileName}`
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('上传出错', err.message)
    }
  }
}

module.exports = R2Uploader
