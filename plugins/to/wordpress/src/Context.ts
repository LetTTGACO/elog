import type { PluginContext } from '@elogx-test/elog';

export default class {
  readonly ctx: PluginContext;
  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
