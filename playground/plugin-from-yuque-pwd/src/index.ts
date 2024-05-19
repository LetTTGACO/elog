import type { IPlugin, DocDetail } from '@elogx-test/elog';
import { YuqueInputConfig, YuqueWithPwdConfig } from './types';
import YuqueClient from './YuqueClient';

export default function yuque(options: YuqueInputConfig): IPlugin {
  return {
    name: 'from-yuque-pwd',
    async down(this) {
      let docDetailList: DocDetail[] = [];
      const client = new YuqueClient(options as YuqueWithPwdConfig, this);
      docDetailList = await client.getDocDetailList();
      return docDetailList;
    },
  };
}
