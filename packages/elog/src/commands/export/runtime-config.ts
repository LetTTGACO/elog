import type { ElogConfig } from '../../types/common';
import type { FromPlugin, ToPlugin, TransformPlugin } from '../../plugins/types';
import type { ExportSelection, SelectedPlugin } from '../init/types';

type ExportCommandErrorCode = 'EXPORT_PLUGIN_IMPORT_FAILED' | 'EXPORT_PLUGIN_FACTORY_FAILED';

type PluginFactory = (options: Record<string, unknown>) => FromPlugin | TransformPlugin | ToPlugin;
type PluginModule = { default?: PluginFactory } | PluginFactory;

export interface BuildExportRuntimeConfigOptions {
  loadPlugin?: (packageName: string) => Promise<PluginFactory>;
}

export class ExportCommandError extends Error {
  readonly code: ExportCommandErrorCode;

  constructor(code: ExportCommandErrorCode, message: string) {
    super(message);
    this.name = 'ExportCommandError';
    this.code = code;
  }
}

async function defaultLoadPlugin(packageName: string): Promise<PluginFactory> {
  let module: PluginModule;
  try {
    module = (await import(packageName)) as PluginModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ExportCommandError(
      'EXPORT_PLUGIN_IMPORT_FAILED',
      `Failed to import ${packageName}: ${message}`,
    );
  }

  const factory = typeof module === 'function' ? module : module.default;
  if (typeof factory !== 'function') {
    throw new ExportCommandError(
      'EXPORT_PLUGIN_IMPORT_FAILED',
      `Plugin package ${packageName} does not export a default factory function.`,
    );
  }
  return factory;
}

async function createPlugin(
  selected: SelectedPlugin,
  loadPlugin: (packageName: string) => Promise<PluginFactory>,
): Promise<FromPlugin | TransformPlugin | ToPlugin> {
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

export async function buildExportRuntimeConfig(
  selection: ExportSelection,
  options: BuildExportRuntimeConfigOptions = {},
): Promise<ElogConfig> {
  const loadPlugin = options.loadPlugin ?? defaultLoadPlugin;
  const from = (await createPlugin(selection.from, loadPlugin)) as FromPlugin;
  const plugins = (await Promise.all(
    selection.transforms.map((plugin) => createPlugin(plugin, loadPlugin)),
  )) as TransformPlugin[];
  const target = (await createPlugin(selection.to, loadPlugin)) as ToPlugin;

  return {
    disableCache: true,
    disableCacheWrite: true,
    from,
    ...(plugins.length ? { plugins } : {}),
    to: target,
  };
}
