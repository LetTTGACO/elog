import { DocDetail } from './doc';

export interface ImageUrl {
  /** 更新后的 url */
  url: string;
  /** 原始 url*/
  originalUrl: string;
}

export interface ImageSource {
  fileName: string;
  originalUrl: string;
  url: string;
}

export interface ImageUploader {
  hasImage: (filename: string) => Promise<string | null | undefined>;
  uploadImage: (
    fileName: string,
    buffer: Buffer,
    doc?: DocDetail,
  ) => Promise<string | null | undefined>;
}

export interface ImageBaseConfig {
  /** 是否禁用 */
  disable?: boolean;
  /** 并发数 */
  limit?: number;
}