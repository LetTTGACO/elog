/** 插件生命周期 hook 名称，用于错误包装时定位失败阶段。 */
export type ElogHookName = 'download' | 'transform' | 'deploy';

/** Elog 运行时基础错误，保留 cause 方便 CLI 或调用方继续追踪原始异常。 */
export class ElogError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ElogError';
    this.cause = cause;
  }
}

/** 插件错误会附带插件名和 hook 名，便于多插件工作流定位问题。 */
export class ElogPluginError extends ElogError {
  readonly pluginName: string;
  readonly hookName: ElogHookName;

  constructor(pluginName: string, hookName: ElogHookName, cause?: unknown) {
    const message = `Plugin "${pluginName}" failed during "${hookName}" hook`;
    super(message, cause);
    this.name = 'ElogPluginError';
    this.pluginName = pluginName;
    this.hookName = hookName;
  }
}

/** 配置错误在进入运行链路前抛出，避免和插件执行失败混淆。 */
export class ElogConfigError extends ElogError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ElogConfigError';
  }
}
