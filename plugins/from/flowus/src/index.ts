import type { FromPlugin } from '@elogx-test/elog';
import type { FlowUsConfig } from './types';
import FlowUsClient from './FlowUsClient';

export default function flowus(options: Partial<FlowUsConfig>): FromPlugin {
  return {
    name: 'from:flowus',
    kind: 'from',
    async download(ctx) {
      const flowus = new FlowUsClient(options as FlowUsConfig, ctx);
      return flowus.getDocDetailList();
    },
  };
}
