import type { IPlugin, DocDetail } from '@elogx-test/elog';
import type { YuqueInputConfig } from './types';
import YuqueWithPwd from './pwd/YuqueWithPwd';
import YuqueWithToken from './token/YuqueWithToken';

export default function yuque(options: YuqueInputConfig): IPlugin {
  return {
    name: 'from-yuque',
    async down() {
      let docDetailList: DocDetail[] = [];
      if (options.pwd) {
        const client = new YuqueWithPwd(options.pwd, this);
        docDetailList = await client.getDocDetailList();
      } else if (options.token) {
        const client = new YuqueWithToken(options.token, this);
        docDetailList = await client.getDocDetailList();
      }
      return docDetailList;
    },
  };
}
