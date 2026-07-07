import type { DocDetail, PluginContext } from '@elog/plugin-sdk';
import { ElogImageContext } from '@elog/plugin-sdk';
import B2Api from './ImageApi';
import type { ImageB2Config } from './types';

export default class ImageClient extends ElogImageContext {
  private readonly api: B2Api;

  constructor(config: ImageB2Config, ctx: PluginContext) {
    super(ctx, config);
    this.api = new B2Api(config, ctx);
  }

  async processImages(docDetailList: DocDetail[]) {
    return this.replaceImages(docDetailList, this.api);
  }
}
