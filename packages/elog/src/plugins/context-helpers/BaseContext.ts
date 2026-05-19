import type { PluginContext } from '../types';

/** 插件上下文基类，给 from/transform 辅助类共享同一份运行时能力。 */
export class ElogBaseContext {
  readonly ctx: PluginContext;
  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
