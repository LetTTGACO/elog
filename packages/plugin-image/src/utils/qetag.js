import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
// 计算文件的eTag，参数为buffer或者readableStream或者文件路径
export function getEtag(buffer, callback) {
  // 判断传入的参数是buffer还是stream还是filepath
  let mode = 'buffer'

  if (typeof buffer === 'string') {
    // eslint-disable-next-line no-param-reassign
    buffer = require('fs').createReadStream(buffer)
    mode = 'stream'
  } else if (buffer instanceof require('stream')) {
    mode = 'stream'
  }

  // sha1算法
  const sha1 = function (content) {
    const crypto = require('crypto')
    const sha1 = crypto.createHash('sha1')
    sha1.update(content)
    return sha1.digest()
  }

  // 以4M为单位分割
  const blockSize = 4 * 1024 * 1024
  const sha1String = []
  let prefix = 0x16
  let blockCount = 0

  // eslint-disable-next-line default-case
  switch (mode) {
    case 'buffer':
      // eslint-disable-next-line
      const bufferSize = buffer.length;
      blockCount = Math.ceil(bufferSize / blockSize)

      for (let i = 0; i < blockCount; i++) {
        sha1String.push(sha1(buffer.slice(i * blockSize, (i + 1) * blockSize)))
      }
      process.nextTick(function () {
        callback(calcEtag())
      })
      break
    case 'stream':
      // eslint-disable-next-line no-case-declarations
      const stream = buffer
      stream.on('readable', function () {
        let chunk
        // eslint-disable-next-line no-cond-assign
        while ((chunk = stream.read(blockSize))) {
          sha1String.push(sha1(chunk))
          blockCount++
        }
      })
      stream.on('end', function () {
        callback(calcEtag())
      })
      break
  }

  function calcEtag() {
    if (!sha1String.length) {
      return 'Fto5o-5ea0sNMlW_75VgGJCv2AcJ'
    }
    let sha1Buffer = Buffer.concat(sha1String, blockCount * 20)

    // 如果大于4M，则对各个块的sha1结果再次sha1
    if (blockCount > 1) {
      prefix = 0x96
      sha1Buffer = sha1(sha1Buffer)
    }

    sha1Buffer = Buffer.concat([Buffer.from([prefix]), sha1Buffer], sha1Buffer.length + 1)

    return sha1Buffer.toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
  }
}
