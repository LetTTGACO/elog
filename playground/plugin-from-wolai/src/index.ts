import type { IPlugin } from '@elogx-test/elog';
import type { WoLaiConfig } from './types';
import WolaiClient from './WolaiClient';

export default function yuque(options: Partial<WoLaiConfig>): IPlugin {
  return {
    name: 'from-flowus',
    async down(this) {
      const notion = new WolaiClient(options as WoLaiConfig, this);
      return notion.getDocDetailList();
    },
  };
}
