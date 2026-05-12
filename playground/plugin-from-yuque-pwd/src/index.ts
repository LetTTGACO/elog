import type { IPlugin } from '@elogx-test/elog';
import { YuqueInputConfig, YuqueWithPwdConfig } from './types';
import YuqueClient from './YuqueClient';

export default function yuque(options: YuqueInputConfig): IPlugin {
  return {
    name: 'from-yuque-pwd',
    async download(this) {
      const client = new YuqueClient(options as YuqueWithPwdConfig, this);
      return client.getDocDetailList();
    },
  };
}
