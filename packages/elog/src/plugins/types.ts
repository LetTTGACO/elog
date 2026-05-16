import type request from '../http/request';
import type { DocDetail, SortedDoc } from '../types/doc';
import type { LoggingFunction } from '../types/log';
import type {
  cleanUrlParam,
  genUniqueIdFromUrl,
  getBaseUrl,
  getBufferFromUrl,
  getFileType,
  getFileTypeFromBuffer,
  getFileTypeFromUrl,
  getUrlListFromContent,
} from '../image';

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

export interface ImageUtils {
  genUniqueIdFromUrl: typeof genUniqueIdFromUrl;
  getFileTypeFromUrl: typeof getFileTypeFromUrl;
  getFileTypeFromBuffer: typeof getFileTypeFromBuffer;
  cleanUrlParam: typeof cleanUrlParam;
  getUrlListFromContent: typeof getUrlListFromContent;
  getBaseUrl: typeof getBaseUrl;
  getFileType: typeof getFileType;
  getBufferFromUrl: typeof getBufferFromUrl;
}

export interface PluginContext {
  workflow: WorkflowInfo;
  logger: Logger;
  http: typeof request;
  cache: CacheReadonlyContext;
  image: ImageUtils;
}

export interface DownloadResult {
  docDetailList: DocDetail[];
  sortedDocList?: SortedDoc<unknown>[];
  docStatusMap: Record<string, { _updateIndex: number; _status: number }>;
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
