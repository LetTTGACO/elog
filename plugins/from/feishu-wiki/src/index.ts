import type { FromPlugin } from '@elogx-test/elog';
import type { FeiShuConfig } from './types';
import FeiShuClient from './FeiShuClient';

export default function feishuWiki(options: Partial<FeiShuConfig>): FromPlugin {
  return {
    name: 'from:feishu-wiki',
    kind: 'from',
    async download(ctx) {
      const feishu = new FeiShuClient(options as FeiShuConfig, ctx);
      return feishu.getDocDetailList();
    },
  };
}
