import type { Buffer } from 'node:buffer';

export interface ImageUrl {
  data: string;
  originalUrl: string;
  type: 'url' | 'base64';
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
