import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import type { ElogConfig } from '@elog/core';
import type { ExportSelection, SelectedPlugin } from '../init/types';

/** export 命令错误码区分导入失败和插件工厂执行失败。 */
type ExportCommandErrorCode = 'EXPORT_PLUGIN_IMPORT_FAILED' | 'EXPORT_PLUGIN_FACTORY_FAILED';

/** 插件包默认导出应为工厂函数，接收向导答案并返回插件实例。 */
type RuntimeToPlugin = ElogConfig['to'] extends infer To
  ? To extends readonly (infer Item)[]
    ? Item
    : To
  : never;
type RuntimeTransformPlugin = NonNullable<ElogConfig['plugins']>[number];
type RuntimePlugin = ElogConfig['from'] | RuntimeTransformPlugin | RuntimeToPlugin;
type PluginFactory = (options: Record<string, unknown>) => RuntimePlugin;
/** 兼容 ESM default export 和直接导出函数两种模块形态。 */
type PluginModule = { default?: PluginFactory } | PluginFactory;

/** 构建临时运行时配置的依赖注入边界，loadPlugin 可在测试中替换。 */
export interface BuildExportRuntimeConfigOptions {
  cwd?: string;
  loadPlugin?: (packageName: string) => Promise<PluginFactory>;
}

/** export 命令专用错误，code 便于 CLI 和测试定位失败阶段。 */
export class ExportCommandError extends Error {
  readonly code: ExportCommandErrorCode;

  constructor(code: ExportCommandErrorCode, message: string) {
    super(message);
    this.name = 'ExportCommandError';
    this.code = code;
  }
}

/** 从用户项目目录解析并动态导入插件包，确保读取的是项目安装版本。 */
async function defaultLoadPlugin(packageName: string, cwd: string): Promise<PluginFactory> {
  let module: PluginModule;
  try {
    const requireFromCwd = createRequire(path.join(cwd, 'package.json'));
    const resolvedPath = requireFromCwd.resolve(packageName);
    module = (await import(pathToFileURL(resolvedPath).href)) as PluginModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExportCommandError(
      'EXPORT_PLUGIN_IMPORT_FAILED',
      `Failed to import ${packageName}: ${message}`,
    );
  }

  const factory = typeof module === 'function' ? module : module.default;
  if (typeof factory !== 'function') {
    // 插件协议要求默认工厂函数；否则无法从向导答案创建运行时插件实例。
    throw new ExportCommandError(
      'EXPORT_PLUGIN_IMPORT_FAILED',
      `Plugin package ${packageName} does not export a default factory function.`,
    );
  }
  return factory;
}

/** 创建单个插件实例，并把导入/工厂错误包装成 export 命令错误。 */
async function createPlugin(
  selected: SelectedPlugin,
  loadPlugin: (packageName: string) => Promise<PluginFactory>,
): Promise<RuntimePlugin> {
  let factory: PluginFactory;
  try {
    factory = await loadPlugin(selected.entry.packageName);
  } catch (error) {
    if (error instanceof ExportCommandError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ExportCommandError(
      'EXPORT_PLUGIN_IMPORT_FAILED',
      `Failed to import ${selected.entry.packageName}: ${message}`,
    );
  }
  try {
    return factory(selected.answers);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExportCommandError(
      'EXPORT_PLUGIN_FACTORY_FAILED',
      `Failed to create ${selected.entry.packageName}: ${message}`,
    );
  }
}

/** 根据 export 选择结果构造一次性运行配置，禁用缓存读写避免污染项目状态。 */
export async function buildExportRuntimeConfig(
  selection: ExportSelection,
  options: BuildExportRuntimeConfigOptions = {},
): Promise<ElogConfig> {
  const cwd = options.cwd ?? process.cwd();
  const loadPlugin = options.loadPlugin ?? ((packageName) => defaultLoadPlugin(packageName, cwd));
  const from = (await createPlugin(selection.from, loadPlugin)) as ElogConfig['from'];
  // transform 可并行创建，因为插件实例之间没有共享状态依赖。
  const plugins = (await Promise.all(
    selection.transforms.map((plugin) => createPlugin(plugin, loadPlugin)),
  )) as RuntimeTransformPlugin[];
  const target = (await createPlugin(selection.to, loadPlugin)) as RuntimeToPlugin;

  return {
    disableCache: true,
    disableCacheWrite: true,
    from,
    ...(plugins.length ? { plugins } : {}),
    to: target,
  };
}
