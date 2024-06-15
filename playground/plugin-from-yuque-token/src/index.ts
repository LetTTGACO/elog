import type { IPlugin } from '@elogx-test/elog';
import { YuqueInputConfig, YuqueWithTokenConfig } from './types';
import YuqueClient from './YuqueClient';

export default function yuque(options: YuqueInputConfig): IPlugin {
  return {
    name: 'from-yuque-token',
    async down(this) {
      const client = new YuqueClient(options as YuqueWithTokenConfig, this);
      return client.getDocDetailList();
    },
  };
}
