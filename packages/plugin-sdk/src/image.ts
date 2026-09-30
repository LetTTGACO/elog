import type { DocDetail } from '@elog/plugin-contracts';

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
