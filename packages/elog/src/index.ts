import { defineConfig } from './config/defineConfig';
import elog from './node-entry';
import { run } from './cli';
// 公共入口集中转出运行时、插件和类型能力，插件包只需要依赖 @elog/cli。
export type * from './types/log';
export * from './types/common';
export * from './types/doc';
export * from './types/image';
export type {
  BasePlugin,
  CacheReadonlyContext,
  DeployResult,
  DownloadResult,
  ElogPlugin,
  FromPlugin,
  FromPluginBaseConfig,
  FromPluginReturn,
  ImageUtils,
  IPlugin,
  Logger,
  PluginContext,
  PluginContext as RuntimePluginContext,
  ToPlugin,
  TransformPlugin,
  WorkflowInfo,
} from './types/plugin';
export * from './plugins/errors';
export * from './plugins/context';
export * from './runtime/types';
export { Graph } from './runtime/Graph';
export { PluginDriver } from './runtime/PluginDriver';
export { WorkflowRunner } from './runtime/WorkflowRunner';
export * from './plugins/context-helpers';
export { run, defineConfig };
export default elog;
