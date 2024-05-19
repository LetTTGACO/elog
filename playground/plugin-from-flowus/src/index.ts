import type { IPlugin } from '@elogx-test/elog';
import type { FlowUsConfig } from './types';
import FlowUsClient from './FlowUsClient';

export default function yuque(options: Partial<FlowUsConfig>): IPlugin {
  return {
    name: 'from-flowus',
    async down(this) {
      const notion = new FlowUsClient(options as FlowUsConfig, this);
      return notion.getDocDetailList();
    },
  };
}
