import type { DocDetail } from '../types/doc';
import out from '../utils/logger';
import request from '../utils/request';
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
import type { PluginContext, WorkflowInfo } from './types';

export function createPluginContext(options: {
  workflow: WorkflowInfo;
  cachedDocList: DocDetail[];
}): PluginContext {
  return {
    workflow: options.workflow,
    logger: {
      debug: out.debug,
      success: out.success,
      error: out.error,
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
    },
  };
}
