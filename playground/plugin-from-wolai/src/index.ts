import type { IPlugin } from '@elogx-test/elog';
import type { FlowUsConfig } from './types';
import WolaiClient from './WolaiClient';

export default function yuque(options: Partial<FlowUsConfig>): IPlugin {
  return {
    name: 'from-flowus',
    async down(this) {
      const notion = new WolaiClient(options as FlowUsConfig, this);
      return notion.getDocDetailList();
    },
  };
}
