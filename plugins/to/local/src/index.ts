import type { ToPlugin } from '@elog/plugin-sdk';
import LocalDeploy from './LocalDeploy';
import type { LocalConfig } from './types';

export default function toLocal(options: Partial<LocalConfig>): ToPlugin {
  return {
    name: 'to:local',
    kind: 'to',
    plugins: options.plugins,
    deploy(docs, ctx) {
      const localDeploy = new LocalDeploy(options as LocalConfig, ctx);
      localDeploy.deploy(docs);
    },
  };
}
