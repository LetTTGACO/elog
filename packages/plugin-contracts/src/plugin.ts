import type { Buffer } from 'node:buffer';
import type { CachedDoc, DocDetail, DocSyncStatusMap, SortedDoc } from './doc';
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
  readonly docList: readonly CachedDoc[];
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
  /** 本次需要转换和部署的文档，增量来源只返回新增及更新项。 */
  docDetailList: DocDetail[];
  /** 当前同步范围的完整列表；缓存写入仅保留其中的 ID。 */
  sortedDocList?: SortedDoc<unknown>[];
  /** 缓存更新状态；缺少状态的文档仍可部署，但不会加入或更新缓存。 */
  docStatusMap: DocSyncStatusMap;
}

export interface DeployResult {
  /** 插件可返回的统计值；当前工作流结果按输入文档数统计，不读取此值。 */
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
  /** 可修改内容、属性和顺序，但必须保持文档 ID 集合、数量及 ID 唯一性。 */
  transform(docs: DocDetail[], ctx: PluginContext): Promise<DocDetail[]>;
}

export interface ToPlugin extends BasePlugin {
  kind: 'to';
  /** 由 Core 在独立文档副本上按顺序执行，仅影响当前部署目标。 */
  plugins?: TransformPlugin[];
  deploy(docs: DocDetail[], ctx: PluginContext): Promise<DeployResult | void> | DeployResult | void;
}

export type ElogPlugin = FromPlugin | TransformPlugin | ToPlugin;

export type FromPluginReturn = DownloadResult;

export type IPlugin = ElogPlugin;
