import { PluginContext } from '../types/plugin';
import out from './logger';
import request from './request';
import {
  cleanUrlParam,
  genUniqueIdFromUrl,
  getBaseUrl,
  getBufferFromUrl,
  getFileType,
  getFileTypeFromBuffer,
  getFileTypeFromUrl,
  getUrlListFromContent,
} from './image';
import { DocDetail } from '../types/doc';

export function getPluginContext(cacheDocList: DocDetail[]): PluginContext {
  return {
    request,
    cacheDocList,
    debug: out.debug,
    error: out.error,
    success: out.success,
    info: out.info,
    warn: out.warn,
    imgUtil: {
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
