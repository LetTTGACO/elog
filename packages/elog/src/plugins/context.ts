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
} from '../image';
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
      error(head) {
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
    },
  };
}
