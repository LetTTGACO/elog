import out from '../logging/logger';
import imgSize from 'image-size';
import request from '../http/request';
import { createHash } from 'node:crypto';
import { ImageUrl } from '../types/image';

interface FileType {
  type: string;
  name?: string;
}

/**
 * 通过图片 url 获取文件 type（不含 "."），优先使用 URL 文件名避免额外下载。
 * @param url
 * @param needError
 */
export const getFileTypeFromUrl = (url: string, needError = true) => {
  const reg = /[^/]+(?!.*\/)/g;
  const imgName = url
    .match(reg)
    ?.filter((item) => item)
    .pop();
  // 去除#
  let filename = '';
  let filetype = '';
  if (imgName) {
    const imgL = imgName.split('.');
    if (imgL.length > 1) {
      filename = imgName.split('.')[0];
      filetype = imgName.split('.')[1].split('?')[0].split('#')[0];
      return {
        name: filename,
        type: filetype,
      };
    } else {
      // needError 用于探测式调用，避免降级到 buffer 识别前产生噪声日志。
      needError && out.warn(`获取文件名失败，跳过: ${url}`);
    }
  } else {
    needError && out.warn(`获取文件名失败，跳过: ${url}`);
  }
};

/** 从图片二进制中识别类型，作为 URL 后缀缺失时的兜底方案。 */
export const getFileTypeFromBuffer = (buffer: Buffer): FileType | undefined => {
  const fileType = imgSize(buffer).type;
  if (fileType) {
    return {
      type: fileType,
    };
  }
};

/**
 * 去除图片链接中多余的参数，用于生成稳定文件名和去重键。
 * @param originalUrl
 */
export const cleanUrlParam = (originalUrl: string) => {
  let newUrl = originalUrl;
  // 去除#号
  const indexPoundSign = originalUrl.indexOf('#');
  if (indexPoundSign !== -1) {
    newUrl = originalUrl.substring(0, indexPoundSign);
  }
  // 去除?号
  const indexQuestionMark = originalUrl.indexOf('?');
  if (indexQuestionMark !== -1) {
    newUrl = originalUrl.substring(0, indexQuestionMark);
  }
  return newUrl;
};

/**
 * 从 md 文档获取图片链接列表，保留原始链接用于最终替换正文。
 * @param content
 */
export const getUrlListFromContent = (content: string): ImageUrl[] => {
  return (content.match(/!\[[^\]]*\]\(([^)]+)\)/g) || [])
    .map((item: string) => {
      const res = item.match(/\!\[.*\]\((.*?)( ".*")?\)/);
      if (res) {
        const originalUrl = res[1];
        // 过滤 Base64 图片
        if (originalUrl.startsWith('data:')) {
          return {
            originalUrl,
            data: originalUrl,
            type: 'base64',
          };
        }
        // data 保持干净链接，originalUrl 保持 Markdown 中的原文以便精准替换。
        const url = cleanUrlParam(originalUrl);
        return {
          originalUrl,
          data: url,
          type: 'url',
        };
      }
      return undefined;
    })
    .filter((item) => item) as ImageUrl[];
};

/**
 * 从 URL 链接获取干净的 url，给插件直接处理单图时复用同一结构。
 * @param url
 */
export const getBaseUrl = (url: string): ImageUrl => {
  return {
    originalUrl: url,
    data: cleanUrlParam(url),
    type: 'url',
  };
};

/**
 * 根据 url 生成唯一文件名，保证不同图床插件使用同一套命名规则。
 * @param url
 * @param length 长度截取
 */
export const genUniqueIdFromUrl = (url: string, length?: number) => {
  const hash = createHash('md5').update(url).digest('hex');
  if (length) {
    return hash.substring(0, length);
  }
  return hash;
};

/**
 * 获取文件类型，按 base64、URL 后缀、下载 buffer 的顺序逐级兜底。
 * @param url
 */
export const getFileType = async (url: string) => {
  // 从 base64 中获取文件类型
  if (url.startsWith('data:')) {
    const base64Reg = /^data:image\/(\w+);base64,/;
    const res = url.match(base64Reg);
    if (res) {
      return {
        type: res[1],
      };
    }
  }
  let fileType: FileType | undefined = getFileTypeFromUrl(url, false);
  if (!fileType) {
    // URL 无后缀时才下载图片探测类型，控制不必要的网络开销。
    const buffer = await getBufferFromUrl(url);
    if (buffer) {
      fileType = getFileTypeFromBuffer(buffer);
      return fileType;
    }
  }
  return fileType;
};

/**
 * 获取图片 buffer，下载失败只告警并返回 undefined，让上层决定文档状态。
 */
export const getBufferFromUrl = async (url: string, options?: any) => {
  try {
    const res = await request<Buffer>(url, {
      dataType: 'arraybuffer',
      ...options,
    });
    out.info('下载成功', url);
    return res.data;
  } catch (e: any) {
    out.warn(`下载失败: ${url}，${e.message}`);
  }
};
