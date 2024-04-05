import type Graph from '../Graph';
import { IPlugin, PluginContext } from '../types/plugin';
import { NormalizeElogOption } from '../types/common';
import out from './logger';
import request from './request';
import {
  cleanParameter,
  generateUniqueId,
  getBaseUrl,
  getBufferFromUrl,
  getFileType,
  getFileTypeFromBuffer,
  getFileTypeFromUrl,
  getUrlListFromContent,
} from './image';

export function getPluginContext(
  plugin: IPlugin,
  graph: Graph,
  options: NormalizeElogOption,
): PluginContext {
  return {
    request,
    debug: out.debug,
    error: out.error,
    success: out.success,
    info: out.info,
    warn: out.warn,
    imageUtil: {
      generateUniqueId,
      getFileTypeFromUrl,
      getFileTypeFromBuffer,
      cleanParameter,
      getUrlListFromContent,
      getBaseUrl,
      getFileType,
      getBufferFromUrl,
    },
  };
}
