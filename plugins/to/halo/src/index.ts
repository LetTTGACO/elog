import type { ToPlugin } from '@elog/cli';
import HaloDeploy from './HaloDeploy';
import type { HaloConfig } from './types';

export default function toHalo(options: Partial<HaloConfig>): ToPlugin {
  return {
    name: 'to:halo',
    kind: 'to',
    async deploy(docs, ctx) {
      const haloDeploy = new HaloDeploy(options as HaloConfig, ctx);
      await haloDeploy.deploy(docs);
    },
  };
}
