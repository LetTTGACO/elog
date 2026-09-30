import type { PluginContext } from '@elog/plugin-contracts';

export class ElogBaseContext {
  readonly ctx: PluginContext;

  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
