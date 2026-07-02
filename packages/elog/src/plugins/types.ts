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
  formatImagePrefix,
  publicUrl,
  contentTypeForFile,
} from '../image';

/** 工作流基础信息会传给所有插件，用于日志和缓存定位。 */
export interface WorkflowInfo {
  id: string;
  cacheFilePath: string;
}

/** 插件使用的日志接口，error 代表插件 fatal 并会中断当前 hook。 */
export interface Logger {
  debug: LoggingFunction;
  success: LoggingFunction;
  error: (head: string) => never;
  info: LoggingFunction;
  warn: LoggingFunction;
}

/** 缓存上下文只读暴露，插件不能直接修改缓存写回策略。 */
export interface CacheReadonlyContext {
  readonly docList: readonly DocDetail[];
}

/** 图片工具集合保证各图床插件复用同一套解析、命名和下载规则。 */
export interface ImageUtils {
  genUniqueIdFromUrl: typeof genUniqueIdFromUrl;
  getFileTypeFromUrl: typeof getFileTypeFromUrl;
  getFileTypeFromBuffer: typeof getFileTypeFromBuffer;
  cleanUrlParam: typeof cleanUrlParam;
  getUrlListFromContent: typeof getUrlListFromContent;
  getBaseUrl: typeof getBaseUrl;
  getFileType: typeof getFileType;
  getBufferFromUrl: typeof getBufferFromUrl;
  formatImagePrefix: typeof formatImagePrefix;
  publicUrl: typeof publicUrl;
  contentTypeForFile: typeof contentTypeForFile;
}

/** 插件运行上下文聚合运行时能力，避免插件直接依赖 CLI 或全局状态。 */
export interface PluginContext {
  workflow: WorkflowInfo;
  logger: Logger;
  http: typeof request;
  cache: CacheReadonlyContext;
  image: ImageUtils;
}

/** 来源插件下载结果，docStatusMap 用于后续缓存更新。 */
export interface DownloadResult {
  docDetailList: DocDetail[];
  sortedDocList?: SortedDoc<unknown>[];
  docStatusMap: Record<string, { _updateIndex: number; _status: number }>;
}

/** 部署插件可选返回部署数量，当前运行时不强依赖该值。 */
export interface DeployResult {
  deployedCount?: number;
}

/** 所有插件共享的元信息边界。 */
export interface BasePlugin {
  name: string;
  version?: string;
}

/** 来源插件负责产出文档详情列表，是工作流的唯一下载入口。 */
export interface FromPlugin extends BasePlugin {
  kind: 'from';
  download(ctx: PluginContext): Promise<DownloadResult>;
}

/** 转换插件负责接收并返回文档列表，通常用于图片替换等中间处理。 */
export interface TransformPlugin extends BasePlugin {
  kind: 'transform';
  transform(docs: DocDetail[], ctx: PluginContext): Promise<DocDetail[]>;
}

/** 目标插件负责外部副作用，运行时允许同一工作流配置多个目标。 */
export interface ToPlugin extends BasePlugin {
  kind: 'to';
  deploy(docs: DocDetail[], ctx: PluginContext): Promise<DeployResult | void> | DeployResult | void;
}

/** 统一插件联合类型，用于注册表或公共 API 暴露。 */
export type ElogPlugin = FromPlugin | TransformPlugin | ToPlugin;
