export type ElogHookName = 'download' | 'transform' | 'deploy';

export class ElogError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ElogError';
    this.cause = cause;
  }
}

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

export class ElogConfigError extends ElogError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ElogConfigError';
  }
}
