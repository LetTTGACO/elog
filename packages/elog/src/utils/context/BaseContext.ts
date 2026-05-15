import type { PluginContext } from '../../plugins/types';

export class ElogBaseContext {
  readonly ctx: PluginContext;
  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
