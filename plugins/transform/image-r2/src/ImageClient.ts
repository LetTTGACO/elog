import type { DocDetail, PluginContext } from '@elog/plugin-sdk';
import { ElogImageContext } from '@elog/plugin-sdk';
import R2Api from './ImageApi';
import type { ImageR2Config } from './types';

export default class ImageClient extends ElogImageContext {
  private readonly api: R2Api;

  constructor(config: ImageR2Config, ctx: PluginContext) {
    super(ctx, config);
    this.api = new R2Api(config, ctx);
  }

  async processImages(docDetailList: DocDetail[]) {
    return this.replaceImages(docDetailList, this.api);
  }
}
