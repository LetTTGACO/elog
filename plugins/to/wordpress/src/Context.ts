import type { PluginContext } from '@elog/plugin-sdk';

export default class {
  readonly ctx: PluginContext;
  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
