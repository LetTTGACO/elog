import type { FromPlugin } from '@elog/cli';
import type { YuqueInputConfig, YuqueWithPwdConfig } from './types';
import YuqueClient from './YuqueClient';

export default function yuquePwd(options: YuqueInputConfig): FromPlugin {
  return {
    name: 'from:yuque-pwd',
    kind: 'from',
    async download(ctx) {
      const client = new YuqueClient(options as YuqueWithPwdConfig, ctx);
      return client.getDocDetailList();
    },
  };
}
