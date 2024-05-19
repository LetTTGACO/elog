import type { IPlugin, DocDetail } from '@elogx-test/elog';
import type { YuqueWithPwdConfig } from './types';
import YuqueClient from './YuqueClient';

export default function yuque(options: YuqueWithPwdConfig): IPlugin {
  return {
    name: 'from-yuque-pwd',
    async down(this) {
      let docDetailList: DocDetail[] = [];
      const client = new YuqueClient(options, this);
      docDetailList = await client.getDocDetailList();
      return docDetailList;
    },
  };
}
