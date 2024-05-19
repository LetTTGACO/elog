import { DocDetail } from './doc';
import { LoggingFunction } from './log';
import type request from '../utils/request';
import {
  cleanUrlParam,
  genUniqueIdFromUrl,
  getBaseUrl,
  getBufferFromUrl,
  getFileType,
  getFileTypeFromBuffer,
  getFileTypeFromUrl,
  getUrlListFromContent,
} from '../utils/image';
import { InputOptions } from './common';

interface ImageUtilContext {
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
  request: typeof request;
  /** 注入日志输出模块 */
  debug: LoggingFunction;
  success: LoggingFunction;
  error: (head: string) => never;
  info: LoggingFunction;
  warn: LoggingFunction;
  imgUtil: ImageUtilContext;
}

/**
 * 用于插件注册配置参数，实现 CLI 命令行配置参数的上下文
 */
// export interface RegisterContext {}

type ObjectHook<T> = T | { handler: T };

export type FunctionReducePluginHooks = 'transform';
export type FunctionVoidPluginHooks = 'start' | 'end' | 'deploy';

export type VoidPluginHooks = Pick<FunctionPluginHooks, FunctionVoidPluginHooks>;
export type ReducePluginHooks = Pick<FunctionPluginHooks, FunctionReducePluginHooks>;

export interface FunctionPluginHooks {
  /** 当前插件流程开始前钩子 */
  start: (this: PluginContext, inputOptions: InputOptions) => Promise<void> | void;
  /** 用于 From 插件的开始下载的钩子 */
  down: (this: PluginContext) => Promise<DocDetail[]> | DocDetail[];
  /** 用于自定义处理文档信息 */
  transform: (this: PluginContext, docs: DocDetail[]) => Promise<DocDetail[]> | DocDetail[];
  /** 用于 To 插件的开始部署的钩子 */
  deploy: (this: PluginContext, docs: DocDetail[]) => Promise<void> | void;
  /** 当前插件流程结束后钩子 */
  end: (this: PluginContext) => Promise<void> | void;
}

export interface IPlugin<A = any> extends Partial<PluginHooks> {
  /**插件名称 以@elog/plugin开头 或 elog-plugin开头 */
  name: string;
}

export type PluginHooks = {
  [K in keyof FunctionPluginHooks]: ObjectHook<FunctionPluginHooks[K]>;
};

/**
 * 写作平台基础配置
 */
export interface FromPluginBaseConfig {
  /** 是否禁用缓存 */
  disableCache?: boolean;
  /** 缓存文件路径 */
  cacheFilePath?: string;
}
