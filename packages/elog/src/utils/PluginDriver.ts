import {
  FunctionPluginHooks,
  FunctionReducePluginHooks,
  FunctionVoidPluginHooks,
  IPlugin,
  PluginContext,
  PluginHooks,
  ReducePluginHooks,
  VoidPluginHooks,
} from '../types/plugin';
import { ElogConfig } from '../types/common';
import { getPluginContext } from './PluginContext';
import out from './logger';
import { getOrCreate } from './getOrCreate';

export class PluginDriver {
  private readonly plugins: readonly IPlugin[];
  private readonly sortedPlugins = new Map<keyof PluginHooks, IPlugin[]>();
  private readonly pluginContexts: ReadonlyMap<IPlugin, PluginContext>;

  constructor(option: ElogConfig) {
    this.plugins = this.normalizeOptions(option);
    this.pluginContexts = new Map(this.plugins.map((plugin) => [plugin, getPluginContext()]));
  }

  normalizeOptions(option: ElogConfig): IPlugin[] {
    if (!option.from) {
      throw new Error('You must supply an `from` option to elog');
    }
    if (!option.to) {
      throw new Error('You must supply an `to` option to elog');
    }

    if (!option.plugins) {
      option.plugins = [];
    }
    let sortedPlugins = [option.from, ...option.plugins];
    if (Array.isArray(option.to)) {
      sortedPlugins = [...sortedPlugins, ...option.to];
    } else {
      sortedPlugins.push(option.to);
    }

    return sortedPlugins;
  }

  async executeChainHooks<H extends FunctionReducePluginHooks>(
    hookName: H,
    [argument0, ...rest]: Parameters<ReducePluginHooks[H]>,
  ) {
    for (const plugin of this.getSortedPlugins(hookName)) {
      argument0 = await this.runHook(
        hookName,
        [argument0, ...rest] as Parameters<ReducePluginHooks[H]>,
        plugin,
      );
    }
    return Promise.resolve(argument0);
  }

  async executeVoidHooks<H extends FunctionVoidPluginHooks>(
    hookName: H,
    args: Parameters<VoidPluginHooks[H]>,
  ): Promise<void> {
    for (const plugin of this.getSortedPlugins(hookName)) {
      await this.runHook(hookName, args, plugin);
    }
  }

  async executeFromPluginHook<H extends keyof FunctionPluginHooks>(
    hookName: H,
    parameters: Parameters<FunctionPluginHooks[H]>,
  ): Promise<ReturnType<FunctionPluginHooks[H]>> {
    const fromPlugin = this.getSortedPlugins(hookName);
    if (!fromPlugin.length || fromPlugin.length > 1) {
      out.error(
        `Error running plugin hook "${hookName}", expected exactly one plugin to handle this hook.`,
      );
    }
    return this.runHook(hookName, parameters, fromPlugin[0]);
  }

  /**
   * Run an async plugin hook and return the result.
   * @param hookName Name of the plugin hook. Must be either in `PluginHooks`
   *   or `OutputPluginValueHooks`.
   * @param parameters Arguments passed to the plugin hook.
   * @param plugin The actual pluginObject to run.
   */
  private async runHook<H extends keyof FunctionPluginHooks>(
    hookName: H,
    parameters: Parameters<FunctionPluginHooks[H]>,
    plugin: IPlugin,
  ): Promise<ReturnType<FunctionPluginHooks[H]>> {
    // We always filter for plugins that support the hook before running it
    const hook = plugin[hookName];
    const handler = typeof hook === 'object' ? hook.handler : hook;

    let context = this.pluginContexts.get(plugin)!;

    let action: [string, string, Parameters<any>] | null = null;
    return Promise.resolve()
      .then(() => {
        if (typeof handler !== 'function') {
          return handler;
        }
        const hookResult = (handler as Function).apply(context, parameters);

        if (!hookResult?.then) {
          // short circuit for non-thenables and non-Promises
          return hookResult;
        }

        return Promise.resolve(hookResult).then((result) => {
          // action was fulfilled
          return result;
        });
      })
      .catch((error_) => {
        if (action !== null) {
          // action considered to be fulfilled since error being handled
        }
        return new Error(error_);
      });
  }

  private getSortedPlugins(
    hookName: keyof FunctionPluginHooks,
    validateHandler?: (handler: unknown, hookName: string, plugin: IPlugin) => void,
  ): IPlugin[] {
    return getOrCreate(this.sortedPlugins, hookName, () =>
      getSortedValidatedPlugins(hookName, this.plugins, validateHandler),
    );
  }
}

export function getSortedValidatedPlugins(
  hookName: keyof FunctionPluginHooks,
  plugins: readonly IPlugin[],
  validateHandler = validateFunctionPluginHandler,
): IPlugin[] {
  const normal: IPlugin[] = [];
  for (const plugin of plugins) {
    const hook = plugin[hookName];
    if (hook) {
      if (typeof hook === 'object') {
        validateHandler(hook.handler, hookName, plugin);
      } else {
        validateHandler(hook, hookName, plugin);
      }
      normal.push(plugin);
    }
  }
  return normal;
}

function validateFunctionPluginHandler(handler: unknown, hookName: string, plugin: IPlugin) {
  if (typeof handler !== 'function') {
    out.error(
      `Error running plugin hook "${hookName}" for plugin "${plugin}", expected a string, a function hook or an object with a "handler" string or function.`,
    );
  }
}
