import type { DocDetail } from './doc';

export interface ImageUrl {
  data: string;
  originalUrl: string;
  type: 'url' | 'base64';
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
  disable?: boolean;
  limit?: number;
  propertyImageFields?: string[];
}

export interface ImageFileType {
  type: string;
  name?: string;
}

export interface ImageDataUrl {
  type: string;
  payload: string;
  buffer: Buffer;
}
