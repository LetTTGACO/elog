import { DocDetail } from './doc';

/** 图片解析结果保留原始地址和清理后的数据源，方便上传后替换正文。 */
export interface ImageUrl {
  data: string;
  /** 原始 url*/
  originalUrl: string;
  type: 'url' | 'base64';
}

/** 图片上传或复用后的映射关系，用于把 Markdown 原图地址替换为新地址。 */
export interface ImageSource {
  fileName: string;
  originalUrl: string;
  url: string;
}

/** 图床插件需要实现的最小上传边界，运行时负责调度和错误处理。 */
export interface ImageUploader {
  hasImage: (filename: string) => Promise<string | null | undefined>;
  uploadImage: (
    fileName: string,
    buffer: Buffer,
    doc?: DocDetail,
  ) => Promise<string | null | undefined>;
}

/** 图片替换插件共享配置，disable 用于快速跳过 transform 逻辑。 */
export interface ImageBaseConfig {
  /** 是否禁用 */
  disable?: boolean;
  /** 并发数 */
  limit?: number;
  /** 将 doc.properties 中这些字段当作图片 URL 一并替换。 */
  propertyImageFields?: string[];
}
