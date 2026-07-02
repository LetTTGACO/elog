import type { ToPlugin } from '@elog/cli';
import LocalDeploy from './LocalDeploy';
import type { LocalConfig } from './types';

export default function toLocal(options: Partial<LocalConfig>): ToPlugin {
  return {
    name: 'to:local',
    kind: 'to',
    deploy(docs, ctx) {
      const localDeploy = new LocalDeploy(options as LocalConfig, ctx);
      localDeploy.deploy(docs);
    },
  };
}
