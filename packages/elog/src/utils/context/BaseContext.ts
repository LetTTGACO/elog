import { PluginContext } from '../../types/plugin';

export class ElogBaseContext {
  readonly ctx: PluginContext;
  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }
}
