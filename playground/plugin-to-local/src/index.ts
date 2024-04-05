import type { IPlugin } from '@elogx-test/elog';
import LocalDeploy from './LocalDeploy';
import { LocalConfig } from './types';

export default function toLocal(options: LocalConfig): IPlugin {
  return {
    name: 'to-local',
    deploy(docs) {
      const localDeploy = new LocalDeploy(options, this);
      localDeploy.deploy(docs);
    },
  };
}
