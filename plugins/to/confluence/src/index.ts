import type { ToPlugin } from '@elog/cli';
import ConfluenceDeploy from './ConfluenceDeploy';
import type { ConfluenceConfig } from './types';

export default function toConfluence(options: Partial<ConfluenceConfig>): ToPlugin {
  return {
    name: 'to:confluence',
    kind: 'to',
    async deploy(docs, ctx) {
      const confluenceDeploy = new ConfluenceDeploy(options as ConfluenceConfig, ctx);
      await confluenceDeploy.deploy(docs);
    },
  };
}
