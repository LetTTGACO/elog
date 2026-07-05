import type { FromPlugin } from '@elog/cli';
import type { FlowUsConfig } from './types';
import FlowUsClient from './FlowUsClient';

// FlowUs access is member-gated and this private source plugin is not actively
// maintained; keep fixes minimal unless FlowUs gets an owner again.
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
