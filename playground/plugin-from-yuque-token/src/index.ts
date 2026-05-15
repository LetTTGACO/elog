import type { FromPlugin } from '@elogx-test/elog';
import type { YuqueInputConfig, YuqueWithTokenConfig } from './types';
import YuqueClient from './YuqueClient';

export default function yuqueToken(options: YuqueInputConfig): FromPlugin {
  return {
    name: 'from:yuque-token',
    kind: 'from',
    async download(ctx) {
      const client = new YuqueClient(options as YuqueWithTokenConfig, ctx);
      return client.getDocDetailList();
    },
  };
}
