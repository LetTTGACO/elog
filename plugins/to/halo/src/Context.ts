import type { PluginContext } from '@elog/cli';

export default class {
  readonly ctx: PluginContext;
  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
