import type { DocDetail, DocSyncStatusMap, SortedDoc } from './doc';
import type { ImageDataUrl, ImageFileType, ImageUrl } from './image';
import type { LoggingFunction } from './log';

export interface WorkflowInfo {
  id: string;
  cacheFilePath: string;
}

export interface Logger {
  debug: LoggingFunction;
  success: LoggingFunction;
  error: (head: string) => never;
  info: LoggingFunction;
  warn: LoggingFunction;
}

export interface CacheReadonlyContext {
  readonly docList: readonly DocDetail[];
}

export interface ElogHttpClientResponse<T> {
  status: number;
  headers: Record<string, string | string[]>;
  data: T;
}

export interface ElogRequestOptions {
  method?: string;
  data?: any;
  auth?: string;
  headers?: Record<string, string>;
  dataType?: 'json' | 'text' | 'buffer';
  contentType?: 'json';
  timeout?: number;
  stream?: any;
  body?: any;
}

export type ElogHttpClient = <T>(
  url: string,
  reqOpts?: ElogRequestOptions,
) => Promise<ElogHttpClientResponse<T>>;

export interface ImageUtils {
  genUniqueIdFromUrl: (url: string, length?: number) => string;
  getFileTypeFromUrl: (
    url: string,
    needError?: boolean,
  ) => { name?: string; type: string } | undefined;
  getFileTypeFromBuffer: (buffer: Buffer) => ImageFileType | undefined;
  cleanUrlParam: (originalUrl: string) => string;
  getUrlListFromContent: (content: string) => ImageUrl[];
  getBaseUrl: (url: string) => ImageUrl;
  getFileType: (url: string) => Promise<ImageFileType | undefined>;
  getBufferFromUrl: (url: string, options?: any) => Promise<Buffer | undefined>;
  getImageDataUrl: (url: string) => ImageDataUrl | undefined;
  formatImagePrefix: (prefix?: string) => string;
}

export interface PluginContext {
  workflow: WorkflowInfo;
  logger: Logger;
  http: ElogHttpClient;
  cache: CacheReadonlyContext;
  image: ImageUtils;
}

export interface DownloadResult {
  docDetailList: DocDetail[];
  sortedDocList?: SortedDoc<unknown>[];
  docStatusMap: DocSyncStatusMap;
}

export interface DeployResult {
  deployedCount?: number;
}

export interface BasePlugin {
  name: string;
  version?: string;
}

export interface FromPlugin extends BasePlugin {
  kind: 'from';
  download(ctx: PluginContext): Promise<DownloadResult>;
}

export interface TransformPlugin extends BasePlugin {
  kind: 'transform';
  transform(docs: DocDetail[], ctx: PluginContext): Promise<DocDetail[]>;
}

export interface ToPlugin extends BasePlugin {
  kind: 'to';
  deploy(docs: DocDetail[], ctx: PluginContext): Promise<DeployResult | void> | DeployResult | void;
}

export type ElogPlugin = FromPlugin | TransformPlugin | ToPlugin;

export type FromPluginReturn = DownloadResult;

export type IPlugin = ElogPlugin;

export interface FromPluginBaseConfig {
  disableCache?: boolean;
  cacheFilePath?: string;
  limit?: number;
}
