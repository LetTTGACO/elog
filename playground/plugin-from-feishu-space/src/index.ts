import type { IPlugin } from '@elogx-test/elog';
import type { FeiShuConfig } from './types';
import FeiShuClient from './FeiShuClient';

export default function yuque(options: Partial<FeiShuConfig>): IPlugin {
  return {
    name: 'from-feishu-space',
    async down(this) {
      const notion = new FeiShuClient(options as FeiShuConfig, this);
      return notion.getDocDetailList();
    },
  };
}
