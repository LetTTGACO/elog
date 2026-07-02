import type { DocDetail } from '../types/doc';
import { LOGLEVEL_ERROR } from '../logging/levels';
import out, { println } from '../logging/logger';
import request from '../http/request';
import {
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
import type { PluginContext, WorkflowInfo } from './types';

/** 创建传给插件的运行时上下文，集中暴露日志、HTTP、缓存和图片工具能力。 */
export function createPluginContext(options: {
  workflow: WorkflowInfo;
  cachedDocList: DocDetail[];
}): PluginContext {
  return {
    workflow: options.workflow,
    logger: {
      debug: out.debug,
      success: out.success,
      error(head) {
        // 插件 fatal 错误通过抛异常交给 PluginDriver 包装，避免插件直接退出进程。
        println(LOGLEVEL_ERROR, head);
        throw new Error(head);
      },
      info: out.info,
      warn: out.warn,
    },
    http: request,
    cache: {
      docList: options.cachedDocList,
    },
    image: {
      genUniqueIdFromUrl,
      getFileTypeFromUrl,
      getFileTypeFromBuffer,
      cleanUrlParam,
      getUrlListFromContent,
      getBaseUrl,
      getFileType,
      getBufferFromUrl,
      formatImagePrefix,
      publicUrl,
      contentTypeForFile,
    },
  };
}
