import type { IPlugin } from '@elogx-test/elog';
import HaloDeploy from './HaloDeploy';
import { HaloConfig } from './types';

export default function toLocal(options: Partial<HaloConfig>): IPlugin {
  return {
    name: 'to-halo',
    async deploy(docs) {
      const haloDeploy = new HaloDeploy(options as HaloConfig, this);
      await haloDeploy.deploy(docs);
    },
  };
}
