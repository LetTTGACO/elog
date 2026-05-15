import { defineConfig } from './utils/elog';
import elog from './node-entry';
import { run } from './cli';
export type * from './types/log';
export * from './types/common';
export * from './types/doc';
export * from './types/image';
export type {
  FromPluginBaseConfig,
  FromPluginReturn,
  FunctionPluginHooks,
  FunctionReducePluginHooks,
  FunctionVoidPluginHooks,
  IPlugin,
  PluginContext as LegacyPluginContext,
  PluginHooks,
  ReducePluginHooks,
  VoidPluginHooks,
} from './types/plugin';
export * from './plugins/types';
export * from './plugins/errors';
export * from './plugins/context';
export * from './runtime/types';
export * from './utils/context';
export * from './utils/doc/form';
export { run, defineConfig };
export default elog;
