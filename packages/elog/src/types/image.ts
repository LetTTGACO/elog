import { DocDetail } from './doc';

export interface ImageUrl {
  /** 更新后的 url */
  url: string;
  /** 原始 url*/
  originalUrl: string;
}

export interface ImageUploader {
  hasImage: (filename: string) => string | null;
  uploadImage: (fileName: string, buffer: Buffer, doc?: DocDetail) => string | null;
}
