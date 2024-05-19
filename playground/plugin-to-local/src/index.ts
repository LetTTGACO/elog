import type { IPlugin } from '@elogx-test/elog';
import LocalDeploy from './LocalDeploy';
import { LocalConfig } from './types';

export default function toLocal(options: Partial<LocalConfig>): IPlugin {
  return {
    name: 'to-local',
    deploy(docs) {
      const localDeploy = new LocalDeploy(options as LocalConfig, this);
      localDeploy.deploy(docs);
    },
  };
}