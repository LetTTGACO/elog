import imgSize from 'image-size'

/**
 * 通过图片url获取文件type, 不含"."
 * @param url
 */
export const getFileTypeFromUrl = (url: string) => {
  const reg = /[^/]+(?!.*\/)/g
  const imgName = url
    .match(reg)
    ?.filter((item) => item)
    .pop()
  // 去除#
  let filename = ''
  let filetype = ''
  if (imgName) {
    filename = imgName.split('.')[0]
    filetype = imgName.split('.')[1].split('?')[0].split('#')[0]
    return {
      name: filename,
      type: filetype,
    }
  }
}

export const getFileTypeFromBuffer = (buffer: Buffer): any => {
  return imgSize(buffer).type
}

interface FileType {
  type: string
  name?: string
}

export const getFileType = (url: string, buffer: Buffer) => {
  let file: FileType | undefined = getFileTypeFromUrl(url)
  if (!file) {
    file = {
      type: getFileTypeFromBuffer(buffer),
    }
  }
  return file
}
