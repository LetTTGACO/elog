import type { FromPlugin } from '@elog/cli';
import type { WoLaiConfig } from './types';
import WolaiClient from './WolaiClient';

export default function wolai(options: Partial<WoLaiConfig>): FromPlugin {
  return {
    name: 'from:wolai',
    kind: 'from',
    async download(ctx) {
      const wolai = new WolaiClient(options as WoLaiConfig, ctx);
      return wolai.getDocDetailList();
    },
  };
}
