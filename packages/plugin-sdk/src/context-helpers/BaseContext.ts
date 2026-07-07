import type { PluginContext } from '../plugin';

export class ElogBaseContext {
  readonly ctx: PluginContext;

  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
